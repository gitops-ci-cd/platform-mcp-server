// Common utilities for HashiCorp Vault API interactions

export interface VaultConfig {
  endpoint: string;
  token: string;
  namespace?: string;
}

/**
 * Load Vault configuration from environment variables
 * @returns Vault configuration object
 * @throws Error if required environment variables are missing
 */
export const getVaultConfig = (): VaultConfig => {
  const endpoint = process.env.VAULT_ADDR || "https://vault.legalzoom.com";
  const token = process.env.VAULT_TOKEN;
  const namespace = process.env.VAULT_NAMESPACE;

  if (!token) {
    throw new Error("VAULT_TOKEN environment variable is required");
  }

  return { endpoint, token, namespace };
};

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
    return { success: true };
  }

  return await response.json();
};

/**
 * Common Vault engine types supported by the API
 */
export const VAULT_ENGINE_TYPES = [
  "kv",
  "kv-v2",
  "database",
  "pki",
  "transit",
  "aws",
  "azure",
  "gcp",
  "kubernetes",
  "ldap",
  "approle",
  "userpass",
  "cert",
  "ssh",
  "totp",
  "nomad",
  "consul",
  "rabbitmq",
  "ad",
  "alicloud",
] as const;

export type VaultEngineType = typeof VAULT_ENGINE_TYPES[number];
