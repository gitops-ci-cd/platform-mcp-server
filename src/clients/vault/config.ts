// Vault configuration utilities
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface VaultConfig {
  endpoint: string;
  token: string;
  namespace?: string;
}

/**
 * Load Vault configuration from environment variables or token file
 * @returns Vault configuration object
 * @throws Error if token cannot be found
 */
export const getVaultConfig = (): VaultConfig => {
  const endpoint = process.env.VAULT_ADDR || "";
  const namespace = process.env.VAULT_NAMESPACE;

  // Try to get token from environment variable first
  let token = process.env.VAULT_TOKEN;

  // If not found, try to read from ~/.vault-token file
  if (!token) {
    const tokenFilePath = join(homedir(), ".vault-token");
    token = readFileSync(tokenFilePath, "utf8").trim();
  }

  // If still not found, throw an error
  if (!token) {
    throw new Error("Vault token not found. Set VAULT_TOKEN environment variable or create ~/.vault-token file");
  }

  return { endpoint, token, namespace };
};
