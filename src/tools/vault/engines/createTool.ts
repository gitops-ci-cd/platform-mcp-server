import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getVaultConfig,
  vaultApiRequest,
  VAULT_ENGINE_TYPES,
} from "../../../clients/vault/index.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const { enginePath, engineType, description, options } = args as {
      enginePath: string;
      engineType: string;
      description?: string;
      options?: Record<string, any>;
    };

    // Get authenticated user for audit logging
    const user = getCurrentUser(`creating Vault engine: ${enginePath}`);

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

    // Check if engine already exists
    let engineExists = false;
    let existingEngine = null;

    try {
      existingEngine = await vaultApiRequest(
        "GET",
        `sys/mounts/${enginePath}`,
        vaultConfig
      );
      engineExists = true;
    } catch (checkError: any) {
      // Engine doesn't exist, continue with creation
      if (!checkError.message.includes("404")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");
    const engineWebUrl = `${vaultWebUrl}/ui/vault/secrets/${enginePath}`;

    if (engineExists) {
      // Engine already exists - return helpful information
      const successData = {
        success: true,
        created: false,
        message: `Vault engine '${enginePath}' already exists and is ready to use`,
        engine: {
          path: enginePath,
          type: existingEngine?.data?.type || engineType,
          description: existingEngine?.data?.description || "",
          uuid: existingEngine?.data?.uuid,
          config: existingEngine?.data?.config,
          options: existingEngine?.data?.options,
          accessor: existingEngine?.data?.accessor,
          status: "existing",
        },
        vault_info: {
          endpoint: vaultConfig.endpoint,
          web_ui: vaultWebUrl,
          engine_url: engineWebUrl,
        },
        accessed_by: user.email,
        accessed_at: new Date().toISOString(),
        next_actions: {
          manage: `Visit ${engineWebUrl} to manage this engine`,
          browse_secrets: `Navigate to ${engineWebUrl}/list to browse secrets`,
          create_secret: `Go to ${engineWebUrl}/create to create a new secret`,
          view_config: `Check ${engineWebUrl}/configuration for engine settings`,
        }
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
      created: true,
      message: `Vault engine '${enginePath}' created successfully`,
      engine: {
        path: enginePath,
        type: engineType,
        description: description || "",
        uuid: engineInfo?.data?.uuid,
        config: engineInfo?.data?.config,
        options: engineInfo?.data?.options,
        accessor: engineInfo?.data?.accessor,
        status: "newly_created",
      },
      vault_info: {
        endpoint: vaultConfig.endpoint,
        web_ui: vaultWebUrl,
        engine_url: engineWebUrl,
      },
      created_by: user.email,
      created_at: new Date().toISOString(),
      next_actions: {
        manage: `Visit ${engineWebUrl} to start managing this engine`,
        create_first_secret: `Go to ${engineWebUrl}/create to create your first secret`,
        configure_engine: `Navigate to ${engineWebUrl}/configuration to adjust settings`,
        learn_more: `Check the Vault documentation for ${engineType} engine best practices`,
      }
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
  description: "Create or verify a Vault secrets engine. Idempotent operation that checks if the engine exists first and provides helpful next actions. Returns management links and guidance for both new and existing engines.",
  inputSchema: z.object({
    enginePath: z.string().describe("Mount path for the secrets engine (e.g., 'secret', 'kv-v2', 'database')"),
    engineType: z.enum(VAULT_ENGINE_TYPES).describe("Type of secrets engine to create"),
    description: z.string().optional().describe("Human-readable description of the engine"),
    options: z.record(z.any()).optional().describe("Engine-specific configuration options (e.g., version for KV, default_lease_ttl)")
  }),
  requiredPermissions: ["vault:admin", "vault:engines:create", "admin"],
  callback
};
