import { vaultApiRequest } from "./client.js";
import { getVaultConfig } from "./config.js";

/**
 * Read metadata for a secret stored in a KV secrets engine
 * Retrieves version history, creation/modification timestamps, and deletion status for a secret.
 * This operation only returns metadata, not the actual secret values.
 *
 * @param engineName Name of the KV secrets engine (e.g., 'secret', 'kv')
 * @param path Path to the secret within the engine (e.g., 'myapp/config', 'database/credentials')
 * @returns Raw response containing secret metadata including versions, timestamps, and deletion status
 * @throws Error if secret doesn't exist or API request fails
 */
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
