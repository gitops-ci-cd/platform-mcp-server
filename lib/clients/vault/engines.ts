import { vaultApiRequest } from "./client.js";
import { getVaultConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * List all secrets engines configured in HashiCorp Vault
 * Retrieves and caches the complete list of mounted secrets engines.
 * Results are cached to improve performance.
 *
 * @param name Optional name parameter for cache filtering (currently unused)
 * @returns Array of engine mount paths (e.g., ['secret/', 'kv/', 'database/'])
 * @throws Never throws - returns empty array on error and logs warning
 */
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

/**
 * Read detailed configuration for a specific secrets engine
 * Retrieves the configuration details for a mounted secrets engine including its type, options, and metadata.
 *
 * @param name Mount path of the secrets engine to read (e.g., 'secret', 'kv', 'database')
 * @returns Raw response containing engine configuration including type, description, and engine-specific options
 * @throws Error if engine doesn't exist or API request fails
 */
export const readEngine = async (name?: string): Promise<Response> => {
  const config = getVaultConfig();
  const response = await vaultApiRequest({
    path: `sys/mounts/${name}`,
    config
  });

  return response;
};

/**
 * Create a new secrets engine mount in HashiCorp Vault
 * Mounts a new secrets engine at the specified path with the provided configuration.
 * Each engine type has different capabilities and configuration options.
 *
 * @param path Mount path for the new secrets engine (e.g., 'my-kv', 'database', 'transit')
 * @param data Engine configuration including type, description, and engine-specific options
 * @returns Raw response containing engine creation confirmation and metadata
 * @throws Error if engine creation fails or configuration is invalid
 */
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

/**
 * Update configuration for an existing secrets engine
 * Updates tunable parameters for a mounted secrets engine such as default TTL, max TTL, and description.
 * Uses the engine's tune endpoint to modify its configuration.
 *
 * @param path Mount path of the secrets engine to update
 * @param data Update configuration including description, default_lease_ttl, max_lease_ttl, and other tunable options
 * @returns Raw response containing engine update confirmation and metadata
 * @throws Error if engine update fails or configuration is invalid
 */
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

/**
 * Create or update a secrets engine mount in HashiCorp Vault
 * This function handles the complete flow of engine creation/update.
 * If the engine doesn't exist, it creates a new mount. If it exists, it updates the configuration.
 *
 * @param path Mount path for the secrets engine (e.g., 'my-kv', 'database', 'transit')
 * @param engineType Type of secrets engine (e.g., 'kv', 'kv-v2', 'database', 'pki', 'transit')
 * @param description Optional human-readable description of the engine
 * @param options Optional engine-specific configuration options (e.g., version for KV, default_lease_ttl)
 * @returns Raw response containing final engine details after upsert operation
 * @throws Error if engine operations fail or configuration is invalid
 */
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
