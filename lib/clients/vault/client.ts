// Vault API client utilities
import type { VaultConfig } from "./config.js";
import { getVaultConfig } from "./config.js";
import { VAULT_ENGINE_TYPES_WITH_ROLES } from "./types.js";
import { resourceCache } from "../../cache.js";

/**
 * Make HTTP request to Vault API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path API path (without /v1/ prefix)
 * @param config Vault configuration
 * @param data Optional request body data
 * @returns Promise with API response
 * @throws Error if API request fails
 */
export const vaultApiRequest = async (
  method: string,
  path: string,
  config: VaultConfig,
  data?: any
): Promise<any> => {
  const url = `${config.endpoint}/v1/${path}`;

  const headers: Record<string, string> = {
    "X-Vault-Token": config.token,
    "Content-Type": "application/json",
  };

  if (config.namespace) {
    headers["X-Vault-Namespace"] = config.namespace;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vault API error (${response.status}): ${errorText}`);
  }

  // Some Vault operations return no content
  if (response.status === 204) {
    return {};
  }

  return await response.json();
};

export const listAuthMethods = async (name: string): Promise<string[]> => {
  try {
    // Check cache first
    const cacheKey = "vault-auth-methods";
    const cachedResults = resourceCache.get(cacheKey);
    if (cachedResults) {
      // Filter based on user input (case-insensitive)
      const filtered = name
        ? cachedResults.filter(key => key.toLowerCase().includes(name.toLowerCase()))
        : cachedResults;

      return filtered;
    }

    const vaultConfig = getVaultConfig();

    // List all auth methods for completion
    const authResponse = await vaultApiRequest(
      "GET",
      "sys/auth",
      vaultConfig
    );

    const sorted = Object.keys(authResponse.data).sort();

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    resourceCache.set(cacheKey, sorted, 30 * 60 * 1000);

    return sorted;
  } catch {
    console.warn("Could not fetch auth methods");
  }

  return [];
};

export const readAuthMethod = async (name: string): Promise<any> => {
  const vaultConfig = getVaultConfig();

  const response = await vaultApiRequest(
    "GET",
    `sys/auth/${name}`,
    vaultConfig
  );

  return response;
};

export const listEngines = async (name: string): Promise<string[]> => {
  try {
    // Check cache first
    const cacheKey = "vault-engines";
    const cachedResults = resourceCache.get(cacheKey);
    if (cachedResults) {
      // Filter based on user input (case-insensitive)
      const filtered = name
        ? cachedResults.filter(key =>
          key.toLowerCase().includes(name.toLowerCase())
        )
        : cachedResults;

      return filtered;
    }

    const vaultConfig = getVaultConfig();

    // List all mounted engines for completion
    const mountsResponse = await vaultApiRequest(
      "GET",
      "sys/mounts",
      vaultConfig
    );

    const sorted = Object.keys(mountsResponse.data).sort();

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    resourceCache.set(cacheKey, sorted, 30 * 60 * 1000);

    return sorted;
  } catch {
    console.warn("Could not fetch engines");
  }

  return [];
};

export const readEngine = async (name: string): Promise<any> => {
  const vaultConfig = getVaultConfig();

  const response = await vaultApiRequest(
    "GET",
    `sys/mounts/${name}`,
    vaultConfig
  );

  return response;
};

export const createEngine = async (path: string, engineConfig: any): Promise<any> => {
  const vaultConfig = getVaultConfig();

  await vaultApiRequest(
    "POST",
    `sys/mounts/${path}`,
    vaultConfig,
    engineConfig
  );
};

export const listPolicies = async (name: string): Promise<string[]> => {
  try {
    // Check cache first
    const cacheKey = "vault-policies";
    const cachedResults = resourceCache.get(cacheKey);
    if (cachedResults) {
      // Filter based on user input (case-insensitive)
      const filtered = name
        ? cachedResults.filter(key => key.toLowerCase().includes(name.toLowerCase()))
        : cachedResults;

      return filtered;
    }

    const vaultConfig = getVaultConfig();

    const policiesResponse = await vaultApiRequest(
      "LIST",
      "sys/policies/acl",
      vaultConfig
    );

    const sorted = policiesResponse.data.keys.sort();

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    resourceCache.set(cacheKey, sorted, 30 * 60 * 1000);

    return sorted;
  } catch {
    console.warn("Could not fetch policies");
  }

  return [];
};

export const readPolicy = async (name: string): Promise<any> => {
  const vaultConfig = getVaultConfig();

  const response = await vaultApiRequest(
    "GET",
    `sys/policies/acl/${name}`,
    vaultConfig
  );

  return response;
};

export const createPolicy = async (name: string, engineConfig: any): Promise<any> => {
  const vaultConfig = getVaultConfig();

  await vaultApiRequest(
    "POST",
    `sys/policies/acl/${name}`,
    vaultConfig,
    engineConfig
  );
};

export const listRoles = async (name: string): Promise<string[]> => {
  try {
    // Check cache first
    const cacheKey = "vault-roles";
    const cachedResults = resourceCache.get(cacheKey);
    if (cachedResults) {
      // Filter based on user input (case-insensitive)
      const filtered = name
        ? cachedResults.filter(key =>
          key.toLowerCase().includes(name.toLowerCase())
        )
        : cachedResults;

      return filtered;
    }

    const vaultConfig = getVaultConfig();

    // List auth methods to find role-enabled backends
    const authMethodsResponse = await vaultApiRequest(
      "GET",
      "sys/auth",
      vaultConfig
    );

    let allRoles: string[] = [];

    // Check each auth method for roles
    for (const [path, authMethod] of Object.entries(authMethodsResponse.data)) {
      const cleanPath = path.replace(/\/$/, "");
      const authType = (authMethod as any).type;

      // Only check auth methods that support roles
      if (VAULT_ENGINE_TYPES_WITH_ROLES.includes(authType)) {
        // For Kubernetes and other auth methods, try both 'role' and 'roles' endpoints
        let rolesResponse;
        try {
          rolesResponse = await vaultApiRequest(
            "LIST",
            rolePath(cleanPath),
            vaultConfig
          );
        } catch {
          // If 'role' fails, try 'roles' (different auth methods use different endpoints)
          try {
            rolesResponse = await vaultApiRequest(
              "LIST",
              `auth/${cleanPath}/roles`,
              vaultConfig
            );
          } catch {
            // Skip auth methods that don't support roles or we can't access
            continue;
          }
        }

        if (rolesResponse?.data?.keys) {
          const roles = rolesResponse.data.keys.map((roleName: string) => {
            return `${cleanPath}/${roleName}`;
          });
          allRoles.push(...roles);
        }
      }
    }

    const sorted = allRoles.sort();

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    resourceCache.set(cacheKey, sorted, 30 * 60 * 1000);

    return sorted;
  } catch {
    console.warn("Could not fetch roles");
  }

  return [];
};

export const readRole = async (authMethod: string, name: string): Promise<any> => {
  const vaultConfig = getVaultConfig();

  const response = await vaultApiRequest(
    "GET",
    `${rolePath(authMethod)}/${name}`,
    vaultConfig
  );

  return response;
};

export const createRole = async (authMethod: string, name: string, roleConfig: any): Promise<any> => {
  const vaultConfig = getVaultConfig();

  await vaultApiRequest(
    "POST",
    `${rolePath(authMethod)}/${name}`,
    vaultConfig,
    roleConfig
  );
};

const rolePath = (authMethod: string): string => {
  // Different auth methods have different role creation endpoints
  let rolePath: string;
  switch (authMethod) {
    case "approle":
      rolePath = "auth/approle/role";
      break;
    case "aws":
      rolePath = "auth/aws/role";
      break;
    case "azure":
      rolePath = "auth/azure/role";
      break;
    case "gcp":
      rolePath = "auth/gcp/role";
      break;
    case "kubernetes":
      rolePath = "auth/kubernetes/role";
      break;
    case "ldap":
      rolePath = "auth/ldap/groups";
      break;
    case "oidc":
    case "jwt":
      rolePath = "auth/jwt/role";
      break;
    case "userpass":
      rolePath = "auth/userpass/users";
      break;
    case "cert":
      rolePath = "auth/cert/certs";
      break;
    case "github":
      rolePath = "auth/github/map/teams";
      break;
    default:
      rolePath = `auth/${authMethod}/role`;
  }

  return rolePath;
};

export const readSecretMetadata = async (engineName: string,  path: string): Promise<any> => {
  const vaultConfig = getVaultConfig();

  const response = await vaultApiRequest(
    "LIST",
    `${engineName}/metadata/${path}`,
    vaultConfig
  );

  return response;
};
