// Vault API client utilities
import type { VaultConfig } from "./config.js";

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
