// Vault API client utilities
import type { VaultConfig } from "./config.js";
import { getVaultConfig } from "./config.js";
import { VAULT_ENGINE_TYPES_WITH_ROLES } from "./types.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * Make HTTP request to Vault API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path API path (without /v1/ prefix)
 * @param config Vault configuration
 * @param data Optional request body data
 * @returns Promise with API response
 * @throws Error if API request fails
 */
const vaultApiRequest = async ({ method, path, config, data }: {
  method: string,
  path: string,
  config: VaultConfig,
  data?: any
}): Promise<any> => {
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

export const listAuthMethods = async (name?: string): Promise<string[]> => {
  try {
    const cacheKey = "vault-auth-methods";
    const cache = checkCache({ cacheKey, value: name });
    if (cache.length > 0) return cache;

    const config = getVaultConfig();
    const response = await vaultApiRequest({
      method: "GET",
      path: "sys/auth",
      config
    });

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, Object.keys(response.data).sort(), 30 * 60 * 1000);
  } catch {
    console.warn("Could not fetch auth methods");
  }

  return [];
};

export const readAuthMethod = async (name?: string): Promise<any> => {
  const config = getVaultConfig();

  const response = await vaultApiRequest({
    method: "GET",
    path: `sys/auth/${name}`,
    config
  });

  return response;
};

export const listEngines = async (name?: string): Promise<string[]> => {
  try {
    const cacheKey = "vault-engines";
    const cache = checkCache({ cacheKey, value: name });
    if (cache.length > 0) return cache;

    const config = getVaultConfig();

    const response = await vaultApiRequest({
      method: "GET",
      path: "sys/mounts",
      config
    });

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, Object.keys(response.data).sort(), 30 * 60 * 1000);
  } catch {
    console.warn("Could not fetch engines");
  }

  return [];
};

export const readEngine = async (name?: string): Promise<any> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "GET",
    path: `sys/mounts/${name}`,
    config
  });

  return response;
};

export const createEngine = async ({ path, data }: {
  path: string,
  data: any,
}): Promise<any> => {
  const config = getVaultConfig();
  await vaultApiRequest({
    method: "POST",
    path: `sys/mounts/${path}`,
    config,
    data
  });
};

export const listPolicies = async (name?: string): Promise<string[]> => {
  try {
    const cacheKey = "vault-policies";
    const cache = checkCache({ cacheKey, value: name });
    if (cache.length > 0) return cache;

    const config = getVaultConfig();
    const response = await vaultApiRequest({
      method: "LIST",
      path: "sys/policies/acl",
      config
    });

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, response.data.keys.sort(), 30 * 60 * 1000);
  } catch {
    console.warn("Could not fetch policies");
  }

  return [];
};

export const readPolicy = async (name?: string): Promise<any> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "GET",
    path: `sys/policies/acl/${name}`,
    config
  });

  return response;
};

export const createPolicy = async ({ name, data }: {
  name: string,
  data: any
}): Promise<any> => {
  const config = getVaultConfig();
  await vaultApiRequest({
    method: "POST",
    path: `sys/policies/acl/${name}`,
    config,
    data
  });
};

export const listRoles = async (name?: string): Promise<string[]> => {
  try {
    const cacheKey = "vault-roles";
    const cache = checkCache({ cacheKey, value: name });
    if (cache.length > 0) return cache;

    // List auth methods to find role-enabled backends
    const config = getVaultConfig();
    const authMethodsResponse = await vaultApiRequest({
      method: "GET",
      path: "sys/auth",
      config
    });

    let allRoles: string[] = [];

    // Check each auth method for roles
    for (const [path, authMethod] of Object.entries(authMethodsResponse.data)) {
      const cleanPath = path.replace(/\/$/, "");
      const authType = (authMethod as any).type;

      // Only check auth methods that support roles
      if (VAULT_ENGINE_TYPES_WITH_ROLES.includes(authType)) {
        let rolesResponse;
        try {
          rolesResponse = await vaultApiRequest({
            method: "LIST",
            path: rolePath(cleanPath),
            config
          });
        } catch {
          // some auth types don't have roles
          continue;
        }

        if (rolesResponse?.data?.keys) {
          const roles = rolesResponse.data.keys.map((roleName: string) => {
            return `${cleanPath}/${roleName}`;
          });
          allRoles.push(...roles);
        }
      }
    }

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, allRoles.sort(), 30 * 60 * 1000);
  } catch {
    console.warn("Could not fetch roles");
  }

  return [];
};

export const readRole = async ({ authMethod, name }: {
  authMethod: string,
  name: string
}): Promise<any> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "GET",
    path: `${rolePath(authMethod)}/${name}`,
    config
  });

  return response;
};

export const createRole = async ({ authMethod, name, data }: {
  authMethod: string,
  name: string,
  data: any
}): Promise<any> => {
  const config = getVaultConfig();
  await vaultApiRequest({
    method: "POST",
    path: `${rolePath(authMethod)}/${name}`,
    config,
    data
  });
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

export const readSecretMetadata = async ({ engineName, path }: {
  engineName: string,
  path: string
}): Promise<any> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "LIST",
    path: `${engineName}/metadata/${path}`,
    config
  });

  return response;
};
