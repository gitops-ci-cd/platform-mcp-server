import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * Static development AuthInfo for local testing
 */
const DEV_AUTH_INFO: AuthInfo = {
  token: process.env.ENTRA_TOKEN || "dev-token", // Use real token if provided
  clientId: "dev-client",
  scopes: ["openid", "profile"],
  expiresAt: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
  extra: {
    userId: "dev-user",
    email: "developer@localhost",
    name: "Development User",
    roles: ["admin"],
    permissions: ["admin"], // Full access in dev mode
  },
};

/**
 * Get user info with development mode support
 * @param authInfo - Optional auth info from MCP SDK (required in production)
 * @returns User object with permissions
 */
export const getUserInfo = (authInfo?: AuthInfo) => {
  // In development mode, bypass auth and use static dev AuthInfo
  if (process.env.NODE_ENV === "development") {
    return getUserFromAuthInfo(DEV_AUTH_INFO);
  }

  // Production mode: require auth
  if (!authInfo) {
    throw new Error("Authentication required");
  }

  return getUserFromAuthInfo(authInfo);
};

/**
 * Extract user info from MCP AuthInfo
 */
const getUserFromAuthInfo = (authInfo: AuthInfo) => {
  const extra = authInfo.extra || {};
  return {
    id: extra.userId as string,
    email: extra.email as string,
    name: extra.name as string,
    roles: extra.roles as string[],
    permissions: extra.permissions as string[],
    token: authInfo.token, // Include original JWT token for delegated API calls
  };
};

export type AuthenticatedUser = ReturnType<typeof getUserFromAuthInfo>;
