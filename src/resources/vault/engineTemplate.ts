import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, listEngines, readEngine } from "../../../lib/clients/vault/index.js";

// Read callback function for vault engine resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { engineName } = variables as {
    engineName: string;
  };

  // Convert the flattened engine path back to the real path (replace -- with /)
  const realEngineName = engineName.replace(/--/g, "/");

  try {
    const vaultConfig = getVaultConfig();
    const response = await readEngine(realEngineName);
    const json = await response.json();

    return resourceResponse(
      {
        message: `Retrieved Vault secret engine: ${realEngineName}`,
        data: json.data,
        metadata: {
          name: realEngineName,
          potentialActions: [
            "Configure engine via Vault UI link above",
            "Review engine documentation for configuration options",
          ],
        },
        links: {
          ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/secrets/${encodeURIComponent(realEngineName)}`,
          concept: "https://developer.hashicorp.com/vault/docs/secrets",
          apiDocs: "https://developer.hashicorp.com/vault/api-docs/system/mounts",
          cliDocs: "https://developer.hashicorp.com/vault/docs/commands/secrets",
        },
      },
      uri
    );
  } catch (error: any) {
    return resourceResponse(
      {
        message: `Failed to read Vault engine ${realEngineName}: ${error.message}`,
        links: {
          docs: "https://developer.hashicorp.com/vault/api-docs/system/mounts",
          troubleshooting:
            "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault",
        },
        metadata: {
          troubleshooting: [
            "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
            "Verify your Vault token has 'sys/mounts' read permissions",
            `Check that the engine path '${realEngineName}' exists and is spelled correctly`,
            "Check Vault server connectivity and accessibility",
          ],
        },
      },
      uri
    );
  }
};

// Resource template definition for vault engines
export const vaultEngineTemplate: ResourceTemplateDefinition = {
  title: "Vault Secret Engines",
  resourceTemplate: new ResourceTemplate("vault://engines/{engineName}", {
    list: undefined,
    complete: {
      engineName: async (value: string): Promise<string[]> => {
        const response = await listEngines(value);

        return response
          .map((path) => path.replace(/\/$/, "")) // Remove trailing slash
          .map((path) => path.replace(/\//g, "--")); // Replace / with -- for URI safety
      },
    },
  }),
  metadata: {
    description:
      "Access specific Vault secret engines by path. Provides engine details and configuration",
  },
  readCallback,
};
