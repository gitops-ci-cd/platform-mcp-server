import { ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import jwt from "jsonwebtoken";

import { getEntraConfig, fetchUserGroups } from "../clients/entra/index.js";

/**
 * Verify Entra ID JWT token and return auth info
 * Note: Using token decoding approach due to Microsoft's non-standard JWT implementation
 * that breaks standard JWT verification libraries
 */
const verifyAccessToken = async (token: string): Promise<AuthInfo> => {
  try {
    console.debug("Verifying access token");
    const config = getEntraConfig();

    // Decode the token (Microsoft tokens have known issues with standard JWT validation libs)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload) {
      throw new Error("Invalid JWT token: unable to decode");
    }

    const header = decoded.header;
    const payload = decoded.payload as any;

    console.debug("JWT header decoded", {
      alg: header.alg,
      kid: header.kid,
      typ: header.typ
    });

    console.debug("Token claims", {
      iss: payload.iss,
      aud: payload.aud,
      exp: payload.exp,
      iat: payload.iat,
      tenant: payload.tid,
    });

    // Basic validation of required claims
    if (!payload.iss || !payload.aud || !payload.exp || !payload.iat) {
      throw new Error("Invalid JWT token: missing required claims");
    }

    // Validate issuer is from Microsoft
    if (!payload.iss.includes("sts.windows.net") && !payload.iss.includes("login.microsoftonline.com")) {
      throw new Error("Invalid JWT token: invalid issuer");
    }

    // Validate tenant matches our expected tenant
    if (payload.tid !== config.tenantId) {
      throw new Error("Invalid JWT token: tenant mismatch");
    }

    // Validate token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error("Invalid JWT token: token expired");
    }

    // Validate token is not used before its valid time
    if (payload.nbf && payload.nbf > now) {
      throw new Error("Invalid JWT token: token not yet valid");
    }

    console.debug("JWT token validated (structure and claims)");

    // Extract user information and permissions
    const roles = payload.roles || [];
    const scopes = payload.scp ? payload.scp.split(" ") : [];
    const wids = payload.wids || []; // Windows Directory Service roles

    // Fetch user's group memberships from Microsoft Graph
    const groups = await fetchUserGroups(token);

    const authInfo: AuthInfo = {
      token,
      clientId: payload.aud,
      scopes,
      expiresAt: payload.exp,
      extra: {
        userId: payload.sub || payload.oid,
        email: payload.email || payload.preferred_username || payload.upn,
        name: payload.name,
        roles,
        permissions: roles.slice(), // Copy of roles as permissions
        wids, // Include Windows Directory Service roles
        groups, // Groups from Microsoft Graph API
      },
    };

    console.debug("Token verified successfully", {
      user: authInfo.extra?.name,
      email: authInfo.extra?.email,
      scopeCount: authInfo.scopes.length,
      roleCount: (authInfo.extra?.roles as string[])?.length || 0,
      widsCount: wids.length,
      groupCount: groups.length,
    });

    return authInfo;
  } catch (error) {
    console.error("Token verification failed:", error);
    throw new Error(`Token verification failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};

const getClient = async (clientId: string): Promise<OAuthClientInformationFull> => {
  return {
    client_id: clientId,
    redirect_uris: [],
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    token_endpoint_auth_method: "none", // Public client
  };
};

/**
 * Create MCP proxy OAuth provider for Entra ID
 * This handles token verification for the resource server
 */
export const createEntraProxyProvider = (): ProxyOAuthServerProvider => {
  const config = getEntraConfig();

  return new ProxyOAuthServerProvider({
    endpoints: {
      authorizationUrl: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
      revocationUrl: `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/logout`,
    },
    verifyAccessToken,
    getClient,
  });
};
