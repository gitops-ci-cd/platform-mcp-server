import { ResourceDefinition, resourceResponse } from "../registry.js";
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

    return resourceResponse({
      message: `Found ${engines.length} Vault secret engines`,
      data: {
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
        }
      },
      links: {
        vault_ui: vaultWebUrl,
        docs: "https://www.vaultproject.io/docs/secrets",
        api_docs: "https://www.vaultproject.io/api/system/mounts"
      },
      metadata: {
        potentialActions: [
          "Use createVaultEngine tool to add a new secret engine",
          "Click 'browse_secrets' links above to explore existing engines",
          "Visit the Vault documentation for engine-specific guides"
        ]
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault engines: ${error.message}`,
      links: {
        docs: "https://www.vaultproject.io/api/system/mounts",
        troubleshooting: "https://www.vaultproject.io/docs/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has 'sys/mounts' read permissions",
          "Check Vault server connectivity and accessibility"
        ]
      }
    }, uri);
  }
};

// Resource definition for vault engines
export const vaultEnginesResource: ResourceDefinition = {
  uri: "vault://engines",
  title: "Vault Secret Engines",
  metadata: {
    description: "List of all mounted Vault secret engines with management links",
  },
  requiredPermissions: ["vault:read", "vault:engines:list", "admin"],
  readCallback,
};
