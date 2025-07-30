import { vaultApiRequest } from "./client.js";
import { getVaultConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * List all ACL policies configured in HashiCorp Vault
 * Retrieves and caches the complete list of Access Control List (ACL) policies.
 * Results are cached to improve performance.
 *
 * @param name Optional name parameter for cache filtering (currently unused)
 * @returns Array of policy names (e.g., ['default', 'root', 'my-app-policy'])
 * @throws Never throws - returns empty array on error and logs warning
 */
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

/**
 * Read an ACL policy from HashiCorp Vault
 * Retrieves the policy document and metadata for a specific ACL policy.
 * ACL policies define permissions for paths and operations within Vault.
 *
 * @param name Name of the policy to read (e.g., 'my-app-policy', 'read-only')
 * @returns Raw response containing policy document in HCL format and metadata
 * @throws Error if policy doesn't exist or API request fails
 */
export const readPolicy = async (name?: string): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `sys/policies/acl/${name}`,
    config
  });

  return response;
};

/**
 * Create a new ACL policy in HashiCorp Vault
 * Creates a new Access Control List policy with the specified name and policy document.
 * Policies define what paths and operations users, groups, and roles can access.
 *
 * @param name Unique name for the policy (must be alphanumeric with dashes/underscores)
 * @param data Policy configuration including the policy document in HCL format
 * @returns Raw response containing policy creation confirmation and metadata
 * @throws Error if policy creation fails or policy document is invalid
 */
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
 * @returns Raw response containing policy update confirmation and metadata
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
 * @returns Raw response containing final policy details after upsert operation
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
