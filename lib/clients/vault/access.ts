import { vaultApiRequest } from "./client.js";
import { getVaultConfig } from "./config.js";
import { VAULT_ENGINE_TYPES_WITH_ROLES } from "./types.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * List all authentication methods configured in HashiCorp Vault
 * Retrieves and caches the complete list of auth methods available for authentication.
 * Results are cached to improve performance.
 *
 * @param name Optional name parameter for cache filtering (currently unused)
 * @returns Array of authentication method names (e.g., ['userpass/', 'ldap/', 'oidc/'])
 * @throws Never throws - returns empty array on error and logs warning
 */
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

/**
 * Read detailed configuration for a specific authentication method
 * Retrieves the configuration details for an auth method including its settings and capabilities.
 *
 * @param name Name of the authentication method to read (e.g., 'userpass', 'ldap', 'oidc')
 * @returns Raw response containing auth method configuration including type, description, and method-specific settings
 * @throws Error if auth method doesn't exist or API request fails
 */
export const readAuthMethod = async (name?: string): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `sys/auth/${name}`,
    config
  });

  return response;
};

/**
 * List all roles across all authentication methods that support roles
 * Scans through all configured auth methods and collects roles from those that support them.
 * Only checks auth methods included in VAULT_ENGINE_TYPES_WITH_ROLES for efficiency.
 * Results are cached to improve performance.
 *
 * @param name Optional name parameter for cache filtering (currently unused)
 * @returns Array of role identifiers in format "authmethod/rolename" (e.g., ['kubernetes/my-role', 'aws/ec2-role'])
 * @throws Never throws - returns empty array on error and logs warning
 */
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

/**
 * Read configuration details for a specific role within an authentication method
 * Retrieves the complete configuration for a role including its policies and auth method-specific settings.
 *
 * @param authMethod Authentication method type (e.g., 'approle', 'kubernetes', 'aws')
 * @param name Name of the role to read
 * @returns Raw response containing role configuration details including policies and auth method-specific settings
 * @throws Error if role doesn't exist or API request fails
 */
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

/**
 * Create a new role for a specific authentication method
 * Creates a role with the provided configuration for the specified auth method.
 * Each auth method has different role creation endpoints and configuration options.
 *
 * @param authMethod Authentication method type (e.g., 'approle', 'kubernetes', 'aws')
 * @param name Name for the new role (must be unique within the auth method)
 * @param data Role configuration data including policies and auth method-specific settings
 * @returns Raw response containing role creation confirmation and metadata
 * @throws Error if role creation fails or configuration is invalid
 */
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
 * @returns Raw response containing role update confirmation and metadata
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
 * @returns Raw response containing final role details after upsert operation
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

/**
 * List all identity groups in HashiCorp Vault
 * Retrieves the complete list of identity groups configured in Vault.
 * Results are cached to improve performance.
 *
 * @param name Optional name parameter for cache filtering (currently unused)
 * @returns Array of group names
 * @throws Never throws - returns empty array on error and logs warning
 */
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
 * @returns Raw response containing group details including ID, policies, and metadata
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
 * @returns Raw response containing group creation confirmation with group ID and metadata
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
 * @returns Raw response containing group alias creation confirmation with alias ID and metadata
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
 * @returns Raw response containing group update confirmation and metadata
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
 * @returns Raw response containing final group details after upsert operation
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

/**
 * Determine the correct API path for role operations based on authentication method
 * Different auth methods use different endpoints for role management.
 * This function maps auth method types to their corresponding role API paths.
 *
 * @param authMethod Authentication method type (e.g., 'approle', 'kubernetes', 'ldap')
 * @returns API path for role operations for the given auth method
 * @example
 * rolePath('kubernetes') // returns 'auth/kubernetes/role'
 * rolePath('ldap') // returns 'auth/ldap/groups'
 */
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
