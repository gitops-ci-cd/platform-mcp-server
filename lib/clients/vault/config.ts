import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

import { getCurrentUserToken } from "../../auth/index.js";

export interface VaultConfig {
  endpoint: string;
  namespace?: string;
  jwtAuthPath: string;
  jwtRole: string;
}

/**
 * Load Vault configuration from environment variables
 * @returns Vault configuration object
 * @throws Error if endpoint cannot be found
 */
export const getVaultConfig = (): VaultConfig => {
  const endpoint = process.env.VAULT_ADDR;
  const namespace = process.env.VAULT_NAMESPACE;
  const jwtAuthPath = process.env.VAULT_JWT_AUTH_PATH || "jwt";
  const jwtRole = process.env.VAULT_JWT_ROLE || "mcp-user-role";

  if (!endpoint) {
    throw new Error("VAULT_ADDR environment variable is required");
  }

  return { endpoint, namespace, jwtAuthPath, jwtRole };
};

/**
 * Get Vault access token using JWT authentication or service token
 * @param config Vault configuration
 * @returns Vault token string for API calls
 * @throws Error if token acquisition fails
 */
export const getVaultAccessToken = async ({ config }: {
  config: VaultConfig;
}): Promise<string> => {
  const userToken = getCurrentUserToken();

  if (userToken) {
    // Use JWT auth method to exchange user token for Vault token (preferred when available)
    const authUrl = `${config.endpoint}/v1/auth/${config.jwtAuthPath}/login`;

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.namespace && { "X-Vault-Namespace": config.namespace }),
      },
      body: JSON.stringify({
        role: config.jwtRole,
        jwt: userToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to authenticate with Vault JWT: ${response.status} ${errorText}`);
    }

    const authResponse = await response.json();

    return authResponse.auth.client_token;
  } else {
    // Fallback to service token (environment variable or file)
    let serviceToken = process.env.VAULT_TOKEN;

    if (!serviceToken) {
      try {
        const tokenFilePath = join(homedir(), ".vault-token");
        serviceToken = readFileSync(tokenFilePath, "utf8").trim();
      } catch {
        // Token file doesn't exist or can't be read
      }
    }

    if (serviceToken) return serviceToken;
  }

  throw new Error("No Vault token available. Set VAULT_TOKEN environment variable, create ~/.vault-token file, or provide userToken for JWT auth");
};
