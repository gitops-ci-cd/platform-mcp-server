import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import JwksClient, { SigningKey } from "jwks-client";
import jwt from "jsonwebtoken";

/**
 * Configuration for MS Entra ID authentication
 */
interface EntraConfig {
  tenantId: string;
  clientId: string;
  permissionMapping: Record<string, string[]>;
}

/**
 * Default role-to-permission mappings
 */
const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"],
  developer: ["k8s:view", "k8s:restart", "k8s:logs"],
  viewer: ["k8s:view"],
};

/**
 * Load Entra ID configuration from environment
 */
const loadEntraConfig = (): EntraConfig => {
  const { MS_ENTRA_TENANT_ID: tenantId, MS_ENTRA_CLIENT_ID: clientId, AUTH_PERMISSION_MAPPING } = process.env;

  if (!tenantId || !clientId) {
    throw new Error("MS_ENTRA_TENANT_ID and MS_ENTRA_CLIENT_ID are required");
  }

  // Merge custom permissions with defaults
  let permissionMapping = DEFAULT_PERMISSIONS;
  if (AUTH_PERMISSION_MAPPING) {
    try {
      const custom = JSON.parse(AUTH_PERMISSION_MAPPING);
      permissionMapping = { ...DEFAULT_PERMISSIONS, ...custom };
    } catch {
      console.warn("Invalid AUTH_PERMISSION_MAPPING, using defaults");
    }
  }

  return { tenantId, clientId, permissionMapping };
};

/**
 * Simple and efficient MS Entra ID token verifier
 */
class EntraTokenVerifier implements OAuthTokenVerifier {
  private config: EntraConfig;
  private jwksClient: JwksClient;

  constructor() {
    this.config = loadEntraConfig();
    this.jwksClient = new JwksClient({
      jwksUri: `https://login.microsoftonline.com/${this.config.tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 12 * 60 * 60 * 1000, // 12 hours
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      const payload = await this.validateToken(token);
      return this.createAuthInfo(token, payload);
    } catch (error) {
      throw new Error(`Entra ID validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async validateToken(token: string): Promise<any> {
    // Decode token header to get key ID
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
      throw new Error("Invalid token format");
    }

    const kid = decoded.header.kid;

    // Get signing key and verify
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err: Error | null, key: SigningKey) => {
        if (err || !key) {
          reject(new Error("Failed to get signing key"));
          return;
        }

        jwt.verify(token, key.getPublicKey(), {
          issuer: `https://login.microsoftonline.com/${this.config.tenantId}/v2.0`,
          audience: this.config.clientId,
          algorithms: ["RS256"],
        }, (verifyErr, payload) => {
          if (verifyErr) reject(new Error(`Token verification failed: ${verifyErr.message}`));
          else if (!payload || typeof payload === "string") reject(new Error("Invalid payload"));
          else resolve(payload);
        });
      });
    });
  }

  private createAuthInfo(token: string, payload: any): AuthInfo {
    const roles = payload.roles || [];
    const permissions = new Set<string>();

    // Map roles to permissions
    roles.forEach((role: string) => {
      const rolePermissions = this.config.permissionMapping[role] || [];
      rolePermissions.forEach((permission: string) => permissions.add(permission));
    });

    return {
      token,
      clientId: payload.aud,
      scopes: payload.scp ? payload.scp.split(" ") : [],
      expiresAt: payload.exp,
      extra: {
        userId: payload.sub || payload.oid,
        email: payload.email || payload.preferred_username || payload.upn,
        name: payload.name,
        roles,
        permissions: Array.from(permissions),
      },
    };
  }
}

/**
 * Create authentication middleware for MS Entra ID
 */
export const createEntraAuthMiddleware = () => {
  return requireBearerAuth({
    verifier: new EntraTokenVerifier(),
    requiredScopes: [],
  });
};

/**
 * Extract user info from MCP AuthInfo
 */
export const getUserFromAuthInfo = (authInfo: AuthInfo) => {
  const extra = authInfo.extra || {};
  return {
    id: extra.userId as string,
    email: extra.email as string,
    name: extra.name as string,
    roles: extra.roles as string[],
    permissions: extra.permissions as string[],
  };
};

export type McpAuthenticatedUser = ReturnType<typeof getUserFromAuthInfo>;
