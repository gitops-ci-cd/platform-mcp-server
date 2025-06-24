import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";

// Read callback function for vault engine resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { engineName } = variables as {
    engineName: string
  };

  // Convert the flattened engine path back to the real path (replace -- with /)
  const realEngineName = engineName.replace(/--/g, "/");

  try {
    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Get specific engine details
    const response = await vaultApiRequest(
      "GET",
      `sys/mounts/${realEngineName}`,
      vaultConfig
    );

    if (!response?.data) {
      throw new Error(`Engine '${realEngineName}' not found or no data returned`);
    }

    return resourceResponse({
      message: `Retrieved Vault secret engine: ${realEngineName}`,
      data: response.data,
      metadata: {
        name: realEngineName,
        potentialActions: [
          "Configure engine via Vault UI link above",
          "Review engine documentation for configuration options"
        ]
      },
      links: {
        vaultUI: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/secrets/${encodeURIComponent(realEngineName)}`,
        concept: "https://www.vaultproject.io/docs/secrets",
        apiDocs: "https://www.vaultproject.io/api/system/mounts",
      },
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault engine ${realEngineName}: ${error.message}`,
      links: {
        docs: "https://www.vaultproject.io/api/system/mounts",
        troubleshooting: "https://www.vaultproject.io/docs/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has 'sys/mounts' read permissions",
          `Check that the engine path '${realEngineName}' exists and is spelled correctly`,
          "Check Vault server connectivity and accessibility"
        ]
      }
    }, uri);
  }
};

// Resource template definition for vault engines
export const vaultEnginesTemplate: ResourceTemplateDefinition = {
  title: "Vault Secret Engines",
  resourceTemplate: new ResourceTemplate(
    "vault://engines/{engineName}",
    {
      list: undefined,
      complete: {
        engineName: async (_arg: string): Promise<string[]> => {
          try {
            const vaultConfig = getVaultConfig();

            // List all mounted engines for completion
            const mountsResponse = await vaultApiRequest(
              "GET",
              "sys/mounts",
              vaultConfig
            );

            return Object.keys(mountsResponse.data)
              .map(path => path.replace(/\/$/, "")) // Remove trailing slash
              .map(path => path.replace(/\//g, "--")) // Replace / with -- for URI safety
              .sort();
          } catch {
            console.warn("Could not fetch engines for completion");
          }
          return [];
        }
      }
    }
  ),
  metadata: {
    description: "Access specific Vault secret engines by path. Provides engine details and configuration",
  },
  requiredPermissions: ["vault:read", "vault:engines:read", "admin"],
  readCallback,
};
