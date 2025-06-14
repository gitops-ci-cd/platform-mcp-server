export interface AuthConfig {
  jwksUri: string;
  issuer: string;
  audience: string;
  tenantId?: string;
  requireHttps?: boolean;
  cacheTtl?: number; // JWKS cache TTL in seconds
  roleClaimPath?: string; // Path to roles in JWT (e.g., "roles" or "groups")
  permissionMapping?: Record<string, string[]>; // Map roles to permissions
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  groups?: string[];
}

export interface JWTPayload {
  sub: string; // Subject (user ID)
  email?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  roles?: string[];
  groups?: string[];
  tid?: string; // Tenant ID for MS Entra
  aud?: string | string[]; // Audience
  iss?: string; // Issuer
  exp?: number; // Expiration
  iat?: number; // Issued at
  // MS Entra specific claims
  oid?: string; // Object ID
  upn?: string; // User Principal Name
  appid?: string; // Application ID
  appidacr?: string; // Application authentication context
}

export function loadAuthConfig(): AuthConfig {
  const config: AuthConfig = {
    jwksUri: process.env.AUTH_JWKS_URI || "",
    issuer: process.env.AUTH_ISSUER || "",
    audience: process.env.AUTH_AUDIENCE || "",
    tenantId: process.env.AUTH_TENANT_ID,
    requireHttps: process.env.NODE_ENV === "production",
    cacheTtl: parseInt(process.env.AUTH_CACHE_TTL || "600", 10),
    roleClaimPath: process.env.AUTH_ROLE_CLAIM_PATH || "roles",
    permissionMapping: loadPermissionMapping(),
  };

  // Validate required configuration
  if (!config.jwksUri || !config.issuer || !config.audience) {
    throw new Error(
      "Missing required auth configuration. Please set AUTH_JWKS_URI, AUTH_ISSUER, and AUTH_AUDIENCE environment variables."
    );
  }

  return config;
}

export function createMSEntraAuthConfig(): AuthConfig {
  const tenantId = process.env.MS_ENTRA_TENANT_ID;
  const clientId = process.env.MS_ENTRA_CLIENT_ID;

  if (!tenantId || !clientId) {
    throw new Error(
      "Missing MS Entra configuration. Please set MS_ENTRA_TENANT_ID and MS_ENTRA_CLIENT_ID environment variables."
    );
  }

  return {
    jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
    audience: clientId,
    tenantId,
    requireHttps: process.env.NODE_ENV === "production",
    cacheTtl: parseInt(process.env.AUTH_CACHE_TTL || "600", 10),
    roleClaimPath: process.env.AUTH_ROLE_CLAIM_PATH || "roles",
    permissionMapping: loadPermissionMapping(),
  };
}

function loadPermissionMapping(): Record<string, string[]> {
  // Load permission mapping from environment or use defaults
  const mappingStr = process.env.AUTH_PERMISSION_MAPPING;
  if (mappingStr) {
    try {
      return JSON.parse(mappingStr);
    } catch {
      console.warn("Failed to parse AUTH_PERMISSION_MAPPING, using defaults");
    }
  }

  // Default permission mappings
  return {
    // Admin roles
    admin: ["*"], // All permissions
    "platform-admin": ["k8s:*", "cluster:*"],
    "k8s-admin": ["k8s:admin", "k8s:restart", "k8s:view"],

    // Developer roles
    developer: ["k8s:view", "k8s:restart"],
    "senior-developer": ["k8s:view", "k8s:restart", "k8s:debug"],

    // Operations roles
    ops: ["k8s:restart", "k8s:view", "cluster:view"],
    devops: ["k8s:*", "cluster:view"],

    // Read-only roles
    viewer: ["k8s:view", "cluster:view"],
    intern: ["k8s:view"],
  };
}

// Helper to get auth config based on environment
export function getAuthConfig() {
  return process.env.MS_ENTRA_TENANT_ID ? createMSEntraAuthConfig() : loadAuthConfig();
}
