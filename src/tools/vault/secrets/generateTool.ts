import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getVaultConfig,
  vaultApiRequest,
} from "../../../clients/vault/index.js";

const inputSchema = z.object({
  secretPath: z.string().describe("Path where secret will be stored (e.g., 'myapp/database')"),
  secretKeys: z.array(z.string()).describe("Array of secret key names to create (e.g., ['username', 'password', 'host'])"),
  enginePath: z.string().describe("Secrets engine path (e.g., 'secret', 'kv-v2')"),
  description: z.string().optional().describe("Human-readable description of the secret"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { secretPath, secretKeys, enginePath, description } = args as {
    secretPath: string;
    secretKeys: string[];
    enginePath: string;
    description?: string;
  };

  try {
    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault secret structure: ${enginePath}/${secretPath}`);

    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Create placeholder secret data with empty/placeholder values
    const placeholderData: Record<string, string> = {};
    secretKeys.forEach(key => {
      placeholderData[key] = `<PLACEHOLDER_FOR_${key.toUpperCase()}>`;
    });

    // Determine the API path based on engine type
    // For KV v2, we need to use the /data/ path
    // For KV v1, we use the path directly
    let apiPath: string;

    // Check if this is a KV v2 engine by trying to get engine info
    try {
      const engineInfo = await vaultApiRequest(
        "GET",
        `sys/mounts/${enginePath}`,
        vaultConfig
      );

      const isKvV2 = engineInfo?.data?.options?.version === "2" ||
                     engineInfo?.data?.type === "kv-v2";

      if (isKvV2) {
        apiPath = `${enginePath}/data/${secretPath}`;
      } else {
        apiPath = `${enginePath}/${secretPath}`;
      }
    } catch {
      // If we can't determine engine type, assume KV v2 (most common)
      apiPath = `${enginePath}/data/${secretPath}`;
    }

    // Prepare the secret data payload
    const secretPayload: any = {
      data: placeholderData
    };

    // Add metadata if description is provided (KV v2 only)
    if (description && apiPath.includes("/data/")) {
      secretPayload.metadata = {
        description,
      };
    }

    let data = null;
    let message = "";

    try {
      // Check if secret already exists
      const existingSecret = await vaultApiRequest(
        "GET",
        apiPath,
        vaultConfig
      );
      data = existingSecret;
      message = `Secret structure at '${enginePath}/${secretPath}' already exists and is ready to use`;
    } catch (checkError: any) {
      // Secret doesn't exist, create it
      if (!checkError.message.includes("404") && !checkError.message.includes("not found")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      // Create the secret structure
      await vaultApiRequest(
        "POST",
        apiPath,
        vaultConfig,
        secretPayload
      );

      // Get the created secret to return version info
      try {
        const secretInfo = await vaultApiRequest(
          "GET",
          apiPath,
          vaultConfig
        );
        data = secretInfo;
      } catch {
        data = { data: { data: placeholderData } };
      }

      message = "Secret structure created with placeholder values. Please update with real values using the Vault UI.";
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");
    const secretWebUrl = `${vaultWebUrl}/ui/vault/secrets/${enginePath}/show/${secretPath}`;

    return toolResponse({
      message,
      data, // Raw secret data from Vault API
      links: {
        manage: secretWebUrl,
        vault: vaultWebUrl
      },
      metadata: {
        secret: {
          path: secretPath,
          engine: enginePath,
          full_path: `${enginePath}/${secretPath}`,
          keys: secretKeys,
          version: data?.data?.metadata?.version || 1,
          description: description || ""
        },
        action: message.includes("already exists") ? "verified" : "created",
        note: "For security, actual secret values should be set manually through the Vault web interface."
      }
    });

  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Vault secret structure: ${error.message}`,
      data: error, // Raw error object
      links: {
        docs: "https://developer.hashicorp.com/vault/docs/secrets",
        troubleshooting: "https://developer.hashicorp.com/vault/docs/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Check that the secrets engine exists and is accessible",
          "Verify you have write permissions to the specified path",
          "Ensure the secret keys are valid identifiers",
          "Check Vault server connectivity"
        ]
      }
    }, true);
  }
};

export const generateVaultSecretTool: ToolDefinition = {
  title: "Generate Vault Secret",
  description: "Create or verify a secret structure in Vault with placeholder values. Idempotent operation that checks if the secret exists first. Creates the path and keys but requires manual entry of actual secret values via Vault UI for security.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:secrets:create", "admin"],
  callback
};
