import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, listEngines, readSecretMetadata } from "../../../lib/clients/vault/index.js";

// Read callback function for vault secrets template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { secretMountPath } = variables as {
    secretMountPath: string
  };

  // Convert the flattened engine path back to the real path (replace -- with /)
  const realSecretMountPath = secretMountPath.replace(/--/g, "/");

  try {
    const vaultConfig = getVaultConfig();

    const keys: string[] = [];

    const extractKeys = async (path: string) => {
      const response = await readSecretMetadata({ engineName: realSecretMountPath, path });
      const k = response?.data?.keys || [];
      const secrets = k.filter((key: string) => !key.endsWith("/"));
      const folders = k.filter((key: string) => key.endsWith("/"));

      keys.push(...secrets.map((key: string) => `${path}${key}`));

      for (const folder of folders) {
        // Recursively call extractKeys for subfolders
        await extractKeys(`${path}${folder}`);
      };
    };

    await extractKeys("").catch((error) => {
      throw new Error(`Failed to list secrets at path '${realSecretMountPath}': ${error.message}`);
    });

    return resourceResponse({
      message: `Successfully retrieved secrets from engine: ${realSecretMountPath}`,
      data: {
        keys
      },
      metadata: {
        name: realSecretMountPath,
        totalCount: keys.length,
      },
      links: {
        ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/secrets/${encodeURIComponent(realSecretMountPath)}`,
        concept: "https://developer.hashicorp.com/vault/docs/secrets/kv",
        apiDocs: "https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2",
      }
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault secrets from engine ${realSecretMountPath}: ${error.message}`,
      metadata: {
        troubleshooting: [
          "Verify the engine path exists and is mounted",
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has read permissions for this engine",
        ],
      },
      links: {
        docs: "https://developer.hashicorp.com/vault/docs/secrets/kv",
        troubleshooting: "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault",
      }
    }, uri);
  }
};

// Resource template definition for vault secrets
export const vaultSecretsTemplate: ResourceTemplateDefinition = {
  title: "Vault Secrets by Engine",
  resourceTemplate: new ResourceTemplate(
    "vault://secrets/{secretMountPath}",
    {
      list: undefined,
      complete: {
        secretMountPath: async (value: string): Promise<string[]> => {
          const response = await listEngines(value);

          return response
            .map(path => path.replace(/\/$/, "")) // Remove trailing slash
            .map(path => path.replace(/\//g, "--")); // Replace / with -- for URI safety
        }
      }
    }
  ),
  metadata: {
    description: "List secrets in a specific Vault secret engine with management links",
  },
  requiredPermissions: ["vault:read", "vault:secrets:list", "admin"],
  readCallback,
};
