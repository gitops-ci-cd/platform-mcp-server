import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import {
  getVaultConfig,
  upsertEngine,
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

    // Use the upsert function that handles all the create/update logic
    const response = await upsertEngine({
      path: enginePath,
      engineType,
      description,
      options
    });
    const json = await response.json();
    const data = json?.data || {};
    const message = `Vault engine '${enginePath}' upserted successfully`;

    return toolResponse({
      message,
      data,
      links: {
        ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/secrets/${enginePath}`,
        concept: "https://developer.hashicorp.com/vault/docs/secrets",
        apiDocs: "https://developer.hashicorp.com/vault/api-docs/system/mounts",
        cliDocs: "https://developer.hashicorp.com/vault/docs/commands/secrets",
      },
      metadata: {
        name: enginePath,
        potentialActions: [
          "Use generateVaultSecret tool to create secrets in this engine",
          "Use upsertVaultPolicy tool to control access to this engine",
          "Use requestVaultAccess tool if you need additional permissions"
        ]
      }
    });
  } catch (error: any) {
    return toolResponse({
      message: `Failed to Upsert Vault engine: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/api-docs/system/mounts",
        troubleshooting: "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault",
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

export const upsertVaultEngineTool: ToolDefinition = {
  title: "Upsert Vault Engine",
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description: "Create or update a Vault secrets engine. Returns management links and guidance for both new and existing engines.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:engines:create", "admin"],
  callback
};
