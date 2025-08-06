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
  const jwtRole = process.env.VAULT_JWT_ROLE ?? "mcp-user-role";

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
  if (process.env.VAULT_TOKEN) return process.env.VAULT_TOKEN;

  const userToken = getCurrentUserToken();

  if (userToken) {
    // Use JWT auth method for programmatic token validation
    const authUrl = `${config.endpoint}/v1/auth/${config.jwtAuthPath}/login`;

    console.debug("Vault JWT authentication attempt", {
      authUrl,
      jwtRole: config.jwtRole,
      jwtAuthPath: config.jwtAuthPath,
      namespace: config.namespace,
      tokenLength: userToken.length,
      tokenPrefix: userToken.substring(0, 20) + "...",
      knownClaims: {
        iss: "https://sts.windows.net/a6036950-fc0b-48b2-a94d-88fa2093f4aa/",
        aud: "00000003-0000-0000-c000-000000000000",
        tenant: "a6036950-fc0b-48b2-a94d-88fa2093f4aa"
      }
    });

    const requestBody: any = {
      jwt: userToken,
    };

    // Only include role if it's not empty - allows Vault to use default role
    if (config.jwtRole) {
      requestBody.role = config.jwtRole;
    }

    console.debug("Vault JWT request body", {
      role: requestBody.role || "(using default)",
      jwtLength: requestBody.jwt.length
    });

    const response = await fetch(authUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.namespace && { "X-Vault-Namespace": config.namespace }),
      },
      body: JSON.stringify(requestBody),
    });

    console.debug("Vault JWT response status", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vault JWT authentication failed", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        authUrl,
        role: config.jwtRole,
      });
      throw new Error(`Failed to authenticate with Vault JWT: ${response.status} ${errorText}`);
    }

    const authResponse = await response.json();
    console.debug("Vault JWT authentication successful", {
      tokenLength: authResponse.auth?.client_token?.length || 0,
      tokenType: authResponse.auth?.token_type,
      leaseDuration: authResponse.auth?.lease_duration,
    });

    return authResponse.auth.client_token;
  } else {
    try {
      const tokenFilePath = join(homedir(), ".vault-token");
      return readFileSync(tokenFilePath, "utf8").trim();
    } catch {
      // Token file doesn't exist or can't be read
    }
  }

  throw new Error("No Vault token available. Set VAULT_TOKEN environment variable, create ~/.vault-token file, or provide userToken for JWT auth");
};
