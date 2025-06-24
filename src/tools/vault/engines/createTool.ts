import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import {
  getVaultConfig,
  readEngine,
  createEngine,
  VAULT_ENGINE_TYPES,
} from "../../../../lib/clients/vault/index.js";

const inputSchema = z.object({
  enginePath: z.string().describe("Mount path for the secrets engine (e.g., 'secret', 'kv-v2', 'database')"),
  engineType: z.enum(VAULT_ENGINE_TYPES).describe("Type of secrets engine to create"),
  description: z.string().optional().describe("Human-readable description of the engine"),
  options: z.record(z.any()).optional().describe("Engine-specific configuration options (e.g., version for KV, default_lease_ttl)")
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { enginePath, engineType, description, options } = args as {
    enginePath: string;
    engineType: string;
    description?: string;
    options?: Record<string, any>;
  };

  try {
    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault engine: ${enginePath}`);

    const vaultConfig = getVaultConfig();

    let data = null;
    let message = "";

    try {
      const response = await readEngine(enginePath);
      data = response?.data;
      message = `Vault engine '${enginePath}' already exists and is ready to use`;
    } catch (checkError: any) {
      // Engine doesn't exist, create it
      if (!checkError.message.includes("404")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      const engineConfig = {
        type: engineType,
        ...(description && { description }),
        ...(options && { options })
      };

      // Create the secrets engine
      await createEngine(enginePath, engineConfig);

      // Get the engine details to return comprehensive info
      const response = await readEngine(enginePath);
      data = response?.data;
      message = `Vault engine '${enginePath}' created successfully`;
    }

    return toolResponse({
      message,
      data,
      links: {
        vaultUI: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/secrets/${enginePath}`,
        concept: "https://www.vaultproject.io/docs/secrets",
        apiDocs: "https://www.vaultproject.io/api/system/mounts",
      },
      metadata: {
        name: enginePath,
        potentialActions: [
          "Use generateVaultSecret tool to create secrets in this engine",
          "Use createVaultPolicy tool to control access to this engine",
          "Use requestVaultAccess tool if you need additional permissions"
        ]
      }
    });
  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Vault engine: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/docs/secrets",
        support: "https://developer.hashicorp.com/vault/community"
      },
      metadata: {
        name: enginePath,
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set with admin permissions",
          "Verify your token has sys/mounts/* write capabilities",
          "Ensure the engine path doesn't conflict with existing mounts"
        ]
      }
    }, true);
  }
};

export const createVaultEngineTool: ToolDefinition = {
  title: "Create Vault Engine",
  description: "Create or verify a Vault secrets engine. Idempotent operation that checks if the engine exists first and provides helpful next actions. Returns management links and guidance for both new and existing engines.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:engines:create", "admin"],
  callback
};
