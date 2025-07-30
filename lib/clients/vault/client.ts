// Vault API client utilities
import type { VaultConfig } from "./config.js";
import { getVaultConfig, getVaultAccessToken } from "./config.js";
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
const vaultApiRequest = async ({ method = "GET", path, config, data }: {
  method?: string,
  path: string,
  config: VaultConfig,
  data?: any
}): Promise<Response> => {
  const url = `${config.endpoint}/v1/${path}`;
  const vaultToken = await getVaultAccessToken({ config });
  const headers: Record<string, string> = {
    "X-Vault-Token": vaultToken,
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

  return await response;
};

export const listAuthMethods = async (name?: string): Promise<string[]> => {
  const cacheKey = "vault-auth-methods";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getVaultConfig();
    const response = await vaultApiRequest({
      path: "sys/auth",
      config
    });
    const data = await response.json() || {};

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, Object.keys(data).sort(), 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch auth methods", error);
  }

  return [];
};

export const readAuthMethod = async (name?: string): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `sys/auth/${name}`,
    config
  });

  return response;
};

export const listEngines = async (name?: string): Promise<string[]> => {
  const cacheKey = "vault-engines";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getVaultConfig();
    const response = await vaultApiRequest({
      path: "sys/mounts",
      config
    });
    const data = await response.json() || {};

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, Object.keys(data).sort(), 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch engines", error);
  }

  return [];
};

export const readEngine = async (name?: string): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `sys/mounts/${name}`,
    config
  });

  return response;
};

export const createEngine = async ({ path, data }: {
  path: string,
  data: any,
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `sys/mounts/${path}`,
    config,
    data
  });
  return response;
};

export const updateEngine = async ({ path, data }: {
  path: string,
  data: any,
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `sys/mounts/${path}/tune`,
    config,
    data
  });

  return response;
};

export const upsertEngine = async ({ path, engineType, description, options }: {
  path: string,
  engineType: string,
  description?: string,
  options?: Record<string, any>,
}): Promise<Response> => {
  // First, try to read the existing engine
  const response = await readEngine(path);

  if (response.status === 404) {
    // Engine doesn't exist, create it
    const engineConfig = {
      type: engineType,
      ...(description && { description }),
      ...(options && { options })
    };

    await createEngine({ path, data: engineConfig });
    return await readEngine(path);
  } else if (response.status >= 200 && response.status < 300) {
    // Update the existing engine configuration
    const updateConfig = {
      ...(description && { description }),
      ...(options && options)
    };

    await updateEngine({ path, data: updateConfig });
    return await readEngine(path);
  } else {
    // Some other error occurred
    throw new Error(`Failed to read engine: ${response.status} : ${await response.text()}`);
  }
};

export const listPolicies = async (name?: string): Promise<string[]> => {
  const cacheKey = "vault-policies";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getVaultConfig();
    const response = await vaultApiRequest({
      method: "LIST",
      path: "sys/policies/acl",
      config
    });
    const data = await response.json() || {};

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, data.data.keys.sort(), 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch policies", error);
  }

  return [];
};

export const readPolicy = async (name?: string): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `sys/policies/acl/${name}`,
    config
  });

  return response;
};

export const createPolicy = async ({ name, data }: {
  name: string,
  data: any
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `sys/policies/acl/${name}`,
    config,
    data
  });

  return response;
};

/**
 * Update an existing Vault ACL policy
 * This updates the policy using the same endpoint as creation.
 *
 * @param name Policy name to update
 * @param data Policy configuration data
 * @returns Policy update response
 * @throws Error if policy update fails
 */
export const updatePolicy = async ({ name, data }: {
  name: string,
  data: any
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `sys/policies/acl/${name}`,
    config,
    data
  });

  return response;
};

/**
 * Create or update a Vault ACL policy
 * This function handles the complete flow of policy creation/update.
 *
 * @param name Policy name
 * @param policy Policy document in HCL format
 * @returns Final policy details after upsert
 * @throws Error if policy operations fail or configuration is invalid
 */
export const upsertPolicy = async ({ name, policy }: {
  name: string,
  policy: string
}): Promise<Response> => {
  // First, try to read the existing policy
  const response = await readPolicy(name);

  const data = { policy };

  if (response.status === 404) {
    // Policy doesn't exist, create it
    await createPolicy({ name, data });
    return await readPolicy(name);
  } else if (response.status >= 200 && response.status < 300) {
    // Policy already exists, update it
    await updatePolicy({ name, data });
    return await readPolicy(name);
  } else {
    // Some other error occurred
    throw new Error(`Failed to read policy: ${response.status} : ${await response.text()}`);
  }
};

export const listRoles = async (name?: string): Promise<string[]> => {
  const cacheKey = "vault-roles";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    // List auth methods to find role-enabled backends
    const config = getVaultConfig();
    const authMethodsResponse = await vaultApiRequest({
      path: "sys/auth",
      config
    });
    const authMethodsData = await authMethodsResponse.json();

    let allRoles: string[] = [];

    // Check each auth method for roles
    for (const [path, authMethod] of Object.entries(authMethodsData.data)) {
      const cleanPath = path.replace(/\/$/, "");
      const authType = (authMethod as any).type;

      // Only check auth methods that support roles
      if (VAULT_ENGINE_TYPES_WITH_ROLES.includes(authType)) {
        let rolesData;
        try {
          const rolesResponse = await vaultApiRequest({
            method: "LIST",
            path: rolePath(cleanPath),
            config
          });
          rolesData = await rolesResponse.json();
        } catch {
          // some auth types don't have roles
          continue;
        }

        if (rolesData?.data?.keys) {
          const roles = rolesData.data.keys.map((roleName: string) => {
            return `${cleanPath}/${roleName}`;
          });
          allRoles.push(...roles);
        }
      }
    }

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, allRoles.sort(), 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch roles", error);
  }

  return [];
};

export const readRole = async ({ authMethod, name }: {
  authMethod: string,
  name: string
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `${rolePath(authMethod)}/${name}`,
    config
  });

  return response;
};

export const createRole = async ({ authMethod, name, data }: {
  authMethod: string,
  name: string,
  data: any
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `${rolePath(authMethod)}/${name}`,
    config,
    data
  });

  return response;
};

/**
 * Update an existing Vault role for a specific authentication method
 * This updates the role configuration using the same endpoint as creation.
 *
 * @param authMethod Authentication method type (e.g., 'approle', 'kubernetes', 'aws')
 * @param name Role name to update
 * @param data Role configuration data
 * @returns Role update response
 * @throws Error if role update fails
 */
export const updateRole = async ({ authMethod, name, data }: {
  authMethod: string,
  name: string,
  data: any
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `${rolePath(authMethod)}/${name}`,
    config,
    data
  });

  return response;
};

/**
 * Create or update a Vault role for a specific authentication method
 * This function handles the complete flow of role creation/update.
 *
 * @param authMethod Authentication method type (e.g., 'approle', 'kubernetes', 'aws')
 * @param name Role name
 * @param data Role configuration data including policies and auth method-specific config
 * @returns Final role details after upsert
 * @throws Error if role operations fail or configuration is invalid
 */
export const upsertRole = async ({ authMethod, name, data }: {
  authMethod: string,
  name: string,
  data: any
}): Promise<Response> => {
  // First, try to read the existing role
  const response = await readRole({ authMethod, name });

  if (response.status === 404) {
    // Role doesn't exist, create it
    await createRole({ authMethod, name, data });
    return await readRole({ authMethod, name });
  } else if (response.status >= 200 && response.status < 300) {
    // Role already exists, update it
    await updateRole({ authMethod, name, data });
    return await readRole({ authMethod, name });
  } else {
    // Some other error occurred
    throw new Error(`Failed to read role: ${response.status} : ${await response.text()}`);
  }
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
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "LIST",
    path: `${engineName}/metadata/${path}`,
    config
  });

  return response;
};

export const markKubernetesRoleAdmin = async ({
  cluster,
  role
}: {
  cluster: string,
  role: string
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `kubernetes-roles/${cluster}/${role}/admin`,
    config,
    data: { force: true }
  });

  return response;
};

export const listGroups = async (name?: string): Promise<string[]> => {
  const cacheKey = "vault-groups";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getVaultConfig();
    const response = await vaultApiRequest({
      method: "LIST",
      path: "/identity/group/name",
      config
    });
    const data = await response.json() || {};

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, data.data.keys.sort(), 30 * 60 * 1000);
  } catch (error) {
    console.warn("Could not fetch groups", error);
  }

  return [];
};

/**
 * Read an identity group from HashiCorp Vault
 * Retrieves details about an existing identity group including its policies and metadata.
 *
 * @param name Name of the group to read
 * @returns Group details including ID, policies, and metadata
 * @throws Error if group does not exist or API request fails
 */
export const readGroup = async (name: string): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `identity/group/name/${name}`,
    config
  });

  return response;
};

/**
 * Create a new identity group in HashiCorp Vault
 * Groups provide a way to manage policies and access control for multiple entities.
 * External groups can be associated with external identity providers via group aliases.
 *
 * This operation is idempotent when used with consistent parameters.
 *
 * @param name Unique name for the group
 * @param policies Array of policy names to associate with this group
 * @param type Group type - "external" for external identity providers, "internal" for Vault-managed
 * @returns Group creation response with group ID and metadata
 * @throws Error if group creation fails or configuration is invalid
 */
export const createGroup = async ({
  name,
  policies,
  type = "external"
}: {
  name: string,
  policies: string[],
  type?: string
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: "identity/group",
    config,
    data: {
      name,
      type,
      policies
    }
  });

  return response;
};

/**
 * Create an alias for an identity group to link it with an external identity provider
 * Group aliases enable external groups (from LDAP, OIDC, etc.) to be mapped to Vault groups,
 * allowing external identity provider group memberships to grant Vault policies.
 *
 * @param name Name of the group in the external identity provider
 * @param canonicalID The ID of the Vault group to create an alias for
 * @param mountAccessor The accessor of the auth method mount (e.g., LDAP, OIDC mount)
 * @returns Group alias creation response with alias ID and metadata
 * @throws Error if alias creation fails or parameters are invalid
 */
export const createGroupAlias = async ({
  name,
  canonicalID,
  mountAccessor
}: {
  name: string,
  canonicalID: string,
  mountAccessor: string
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: "identity/group-alias",
    config,
    data: {
      name,
      canonical_id: canonicalID,
      mount_accessor: mountAccessor
    }
  });

  return response;
};

/**
 * Update an existing Vault identity group
 * This updates the group using the name-based endpoint which handles both create and update.
 *
 * @param name Name of the group to update
 * @param policies Array of policy names to associate with this group
 * @param type Group type - "external" for external identity providers, "internal" for Vault-managed
 * @returns Group update response
 * @throws Error if group update fails
 */
export const updateGroup = async ({
  name,
  policies,
  type = "external"
}: {
  name: string,
  policies: string[],
  type?: string
}): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    method: "POST",
    path: `identity/group/name/${name}`,
    config,
    data: {
      policies,
      type
    }
  });

  return response;
};

/**
 * Create or update a Vault identity group with optional external group alias
 * This function handles the complete flow of group creation/update and linking to external identity providers.
 * Uses the existing createGroup and updateGroup functions properly.
 *
 * @param name Unique name for the group
 * @param policies Array of policy names to associate with this group
 * @param groupId Optional external group ID to create an alias for (only on creation)
 * @param mountAccessor The accessor of the auth method mount (required if groupId is provided)
 * @param type Group type - "external" for external identity providers, "internal" for Vault-managed
 * @returns Final group details after upsert
 * @throws Error if group operations fail or configuration is invalid
 */
export const upsertGroup = async ({
  name,
  policies,
  groupId,
  mountAccessor,
  type = "external"
}: {
  name: string,
  policies: string[],
  groupId?: string,
  mountAccessor?: string,
  type?: string
}): Promise<Response> => {
  // First, try to read the existing group
  const response = await readGroup(name);

  if (response.status === 404) {
    // Group doesn't exist, create it
    const createResponse = await createGroup({ name, policies, type });

    // If external group ID is provided, create the alias
    if (groupId && mountAccessor) {
      await new Promise(r => setTimeout(r, 3000)); // Wait for group creation to propagate

      // Get the group ID for the alias
      const createJson = await createResponse.json();

      await createGroupAlias({
        name: groupId,
        canonicalID: createJson.data.id,
        mountAccessor
      });
    }

    return await readGroup(name);
  } else if (response.status >= 200 && response.status < 300) {
    // Group already exists, update it
    await updateGroup({ name, policies, type });
    return await readGroup(name);
  } else {
    // Some other error occurred
    throw new Error(`Failed to read group: ${response.status} : ${await response.text()}`);
  }
};
