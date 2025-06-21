import { ResourceDefinition } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";

// Read callback function for vault engines resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // List all mounted engines
    const mountsResponse = await vaultApiRequest(
      "GET",
      "sys/mounts",
      vaultConfig
    );

    if (!mountsResponse?.data) {
      throw new Error("No mounts data returned from Vault");
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");

    // Transform engines data with action-oriented information
    const engines = Object.entries(mountsResponse.data).map(([path, engineData]: [string, any]) => {
      const cleanPath = path.replace(/\/$/, "");
      const engineWebUrl = `${vaultWebUrl}/ui/vault/secrets/${cleanPath}`;

      return {
        path: cleanPath,
        type: engineData.type,
        description: engineData.description || "",
        uuid: engineData.uuid,
        accessor: engineData.accessor,
        status: "active",
        actions: {
          manage: `${engineWebUrl}`,
          browse_secrets: `${engineWebUrl}/list`,
          create_secret: `${engineWebUrl}/create`,
          configure: `${vaultWebUrl}/ui/vault/secrets/${cleanPath}/configuration`,
        },
        management_info: {
          web_ui: engineWebUrl,
          api_path: `${vaultConfig.endpoint}/v1/${cleanPath}`,
          type_docs: `https://www.vaultproject.io/docs/secrets/${engineData.type}`,
        }
      };
    });

    const resourceData = {
      engines,
      summary: {
        total_count: engines.length,
        by_type: engines.reduce((acc, engine) => {
          acc[engine.type] = (acc[engine.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
      vault_info: {
        endpoint: vaultConfig.endpoint,
        web_ui: vaultWebUrl,
        docs: "https://www.vaultproject.io/docs/secrets",
      },
      next_actions: {
        create_new_engine: "Use createVaultEngine tool to add a new secret engine",
        browse_existing: "Click 'browse_secrets' links above to explore existing engines",
        learn_more: "Visit the Vault documentation for engine-specific guides",
      }
    };

    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(resourceData, null, 2)
        }
      ]
    };

  } catch (error: any) {
    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify({
            error: `Failed to read Vault engines: ${error.message}`,
            troubleshooting: {
              check_vault_token: "Ensure VAULT_TOKEN environment variable is set",
              check_permissions: "Verify your Vault token has 'sys/mounts' read permissions",
              vault_docs: "https://www.vaultproject.io/api/system/mounts",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource definition for vault engines
export const vaultEnginesResource: ResourceDefinition = {
  uri: "vault://engines",
  name: "vaultEngines",
  metadata: {
    name: "Vault Secret Engines",
    description: "List of all mounted Vault secret engines with management links",
  },
  requiredPermissions: ["vault:read", "vault:engines:list", "admin"],
  readCallback,
};
