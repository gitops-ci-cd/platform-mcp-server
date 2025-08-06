import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import {
  getVaultConfig,
  readAuthMethod,
  listAuthMethods,
} from "../../../lib/clients/vault/index.js";

// Read callback function for vault auth method resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { authPath } = variables as {
    authPath: string;
  };

  // Convert the flattened auth path back to the real path (replace -- with /)
  const realAuthPath = authPath.replace(/--/g, "/");

  try {
    const vaultConfig = getVaultConfig();
    const response = await readAuthMethod(realAuthPath);
    const json = await response.json();

    return resourceResponse(
      {
        message: `Retrieved Vault auth method: ${realAuthPath}`,
        data: json.data,
        metadata: {
          name: realAuthPath,
          potentialActions: [
            "Configure auth method via Vault UI link above",
            "Review auth method documentation for configuration options",
          ],
        },
        links: {
          ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/access/${encodeURIComponent(realAuthPath)}`,
          concept: "https://developer.hashicorp.com/vault/docs/auth",
          apiDocs: "https://developer.hashicorp.com/vault/api-docs/system/auth",
          cliDocs: "https://developer.hashicorp.com/vault/docs/commands/auth",
        },
      },
      uri
    );
  } catch (error: any) {
    return resourceResponse(
      {
        message: `Failed to read Vault auth method ${realAuthPath}: ${error.message}`,
        links: {
          docs: "https://developer.hashicorp.com/vault/api-docs/system/auth",
          troubleshooting:
            "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault",
        },
        metadata: {
          troubleshooting: [
            "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
            "Verify your Vault token has 'sys/auth' read permissions",
            `Check that the auth method path '${realAuthPath}' exists and is spelled correctly`,
            "Check Vault server connectivity and accessibility",
          ],
        },
      },
      uri
    );
  }
};

// Resource template definition for vault auth methods
export const vaultAuthMethodTemplate: ResourceTemplateDefinition = {
  title: "Vault Auth Methods",
  resourceTemplate: new ResourceTemplate("vault://auth/{authPath}", {
    list: undefined,
    complete: {
      authPath: async (value: string): Promise<string[]> => {
        const response = await listAuthMethods(value);

        return response
          .map((path) => path.replace(/\/$/, "")) // Remove trailing slash
          .map((path) => path.replace(/\//g, "--")); // Replace / with -- for URI safety
      },
    },
  }),
  metadata: {
    description:
      "Access specific Vault auth methods by path. Provides auth method details and configuration",
  },
  readCallback,
};
