import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";

// Read callback function for vault auth method resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { authPath } = variables as {
    authPath: string
  };

  // Convert the flattened auth path back to the real path (replace -- with /)
  const realAuthPath = authPath.replace(/--/g, "/");

  try {
    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Get specific auth method details
    const response = await vaultApiRequest(
      "GET",
      `sys/auth/${realAuthPath}`,
      vaultConfig
    );

    if (!response?.data) {
      throw new Error(`Auth method '${realAuthPath}' not found or no data returned`);
    }

    return resourceResponse({
      message: `Retrieved Vault auth method: ${realAuthPath}`,
      data: response.data,
      metadata: {
        name: realAuthPath,
        potentialActions: [
          "Configure auth method via Vault UI link above",
          "Review auth method documentation for configuration options"
        ]
      },
      links: {
        vaultUI: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/access/${encodeURIComponent(realAuthPath)}`,
        concept: "https://www.vaultproject.io/docs/auth",
        apiDocs: "https://www.vaultproject.io/api/system/auth",
      },
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault auth method ${realAuthPath}: ${error.message}`,
      links: {
        docs: "https://www.vaultproject.io/api/system/auth",
        troubleshooting: "https://www.vaultproject.io/docs/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has 'sys/auth' read permissions",
          `Check that the auth method path '${realAuthPath}' exists and is spelled correctly`,
          "Check Vault server connectivity and accessibility"
        ]
      }
    }, uri);
  }
};

// Resource template definition for vault auth methods
export const vaultAuthMethodsTemplate: ResourceTemplateDefinition = {
  title: "Vault Auth Methods",
  resourceTemplate: new ResourceTemplate(
    "vault://auth/{authPath}",
    {
      list: undefined,
      complete: {
        authPath: async (_arg: string): Promise<string[]> => {
          try {
            const vaultConfig = getVaultConfig();

            // List all auth methods for completion
            const authResponse = await vaultApiRequest(
              "GET",
              "sys/auth",
              vaultConfig
            );

            return Object.keys(authResponse.data)
              .map(path => path.replace(/\/$/, "")) // Remove trailing slash
              .map(path => path.replace(/\//g, "--")) // Replace / with -- for URI safety
              .sort();
          } catch {
            console.warn("Could not fetch auth methods for completion");
          }
          return [];
        }
      }
    }
  ),
  metadata: {
    description: "Access specific Vault auth methods by path. Provides auth method details and configuration",
  },
  requiredPermissions: ["vault:read", "vault:auth:read", "admin"],
  readCallback,
};
