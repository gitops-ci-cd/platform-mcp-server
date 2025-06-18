import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getUserInfo } from "../../../auth/index.js";
import {
  getVaultConfig,
  vaultApiRequest,
  VAULT_ENGINE_TYPES,
} from "../utils.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const { enginePath, engineType, description, options } = args as {
      enginePath: string;
      engineType: string;
      description?: string;
      options?: Record<string, any>;
    };

    // Get authenticated user for audit logging
    const user = getUserInfo();
    console.log(`User ${user.email} (${user.id}) creating Vault engine: ${enginePath}`);

    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Prepare engine configuration
    const engineConfig: any = {
      type: engineType,
    };

    if (description) {
      engineConfig.description = description;
    }

    if (options) {
      engineConfig.options = options;
    }

    // Create the secrets engine
    await vaultApiRequest(
      "POST",
      `sys/mounts/${enginePath}`,
      vaultConfig,
      engineConfig
    );

    // Get the engine details to return comprehensive info
    const engineInfo = await vaultApiRequest(
      "GET",
      `sys/mounts/${enginePath}`,
      vaultConfig
    );

    const successData = {
      success: true,
      engine: {
        path: enginePath,
        type: engineType,
        description: description || "",
        uuid: engineInfo?.data?.uuid,
        config: engineInfo?.data?.config,
        options: engineInfo?.data?.options,
        accessor: engineInfo?.data?.accessor,
      },
      vault_endpoint: vaultConfig.endpoint,
      created_by: user.email,
      created_at: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(successData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: successData,
    };

  } catch (error: any) {
    const errorData = {
      error: `Failed to create Vault engine: ${error.message}`,
      status: "error",
      details: error.stack || error.toString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(errorData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: errorData,
      isError: true
    };
  }
};

export const createVaultEngineTool: ToolDefinition = {
  name: "createVaultEngine",
  description: "Create a new secrets engine in HashiCorp Vault via direct API call. Supports KV v1/v2, database, PKI, transit, and other engine types.",
  inputSchema: z.object({
    enginePath: z.string().describe("Mount path for the secrets engine (e.g., 'secret', 'kv-v2', 'database')"),
    engineType: z.enum(VAULT_ENGINE_TYPES).describe("Type of secrets engine to create"),
    description: z.string().optional().describe("Human-readable description of the engine"),
    options: z.record(z.any()).optional().describe("Engine-specific configuration options (e.g., version for KV, default_lease_ttl)")
  }),
  requiredPermissions: ["vault:admin", "vault:engines:create", "admin"],
  callback
};
