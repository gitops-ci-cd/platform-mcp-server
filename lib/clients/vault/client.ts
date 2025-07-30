import type { VaultConfig } from "./config.js";
import { getVaultAccessToken } from "./config.js";

/**
 * Make HTTP request to Vault API with proper authentication
 * Handles authentication token injection, namespace headers, and error responses.
 * This is the core function used by all other Vault client operations.
 *
 * @param method HTTP method (GET, POST, PUT, DELETE, LIST)
 * @param path API path (without /v1/ prefix)
 * @param config Vault configuration including endpoint, token, and optional namespace
 * @param data Optional request body data for POST/PUT operations
 * @returns Raw response containing Vault API response data and headers
 * @throws Error if API request fails or authentication is invalid
 */
export const vaultApiRequest = async ({ method = "GET", path, config, data }: {
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
