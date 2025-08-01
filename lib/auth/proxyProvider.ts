import { ProxyOAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js";
import { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
// import jwksClient from "jwks-rsa"; // Temporarily disabled for debugging
import jwt from "jsonwebtoken";

import { getEntraConfig, fetchUserGroups } from "../clients/entra/index.js";

/**
 * Verify Entra ID JWT token and return auth info
 * Note: Currently skips signature verification and trusts Microsoft Graph tokens
 */
const verifyAccessToken = async (token: string): Promise<AuthInfo> => {
  try {
    console.debug("Verifying access token");

    // Decode the JWT token (without signature verification for now)
    const payload = jwt.decode(token) as any;
    if (!payload) {
      throw new Error("Failed to decode JWT token");
    }

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
    redirect_uris: [
      "https://insiders.vscode.dev/redirect",
      "https://vscode.dev/redirect",
      "http://localhost/",
      "http://127.0.0.1/",
      "http://localhost:33418/",
      "http://127.0.0.1:33418/"
    ],
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
