// Vault configuration utilities

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
