import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";

// Read callback function for vault secrets template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri) => {
  try {
    // Extract engine parameter from URI
    const match = uri.toString().match(/vault:\/\/secrets\/(.+)/);
    const enginePath = match?.[1];

    if (!enginePath) {
      throw new Error("Engine path is required. Use format: vault://secrets/{engine}");
    }

    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // List secrets in the specified engine
    const secretsResponse = await vaultApiRequest(
      "GET",
      `${enginePath}/metadata?list=true`,
      vaultConfig
    );

    if (!secretsResponse?.data?.keys) {
      throw new Error(`No secrets found in engine: ${enginePath}`);
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");

    // Transform secrets data with action-oriented information
    const secrets = secretsResponse.data.keys.map((secretName: string) => {
      const isFolder = secretName.endsWith("/");
      const cleanSecretName = secretName.replace(/\/$/, "");
      const secretWebUrl = `${vaultWebUrl}/ui/vault/secrets/${enginePath}/show/${cleanSecretName}`;

      return {
        name: cleanSecretName,
        type: isFolder ? "folder" : "secret",
        engine: enginePath,
        actions: {
          view: secretWebUrl,
          edit: `${vaultWebUrl}/ui/vault/secrets/${enginePath}/edit/${cleanSecretName}`,
          delete: `${secretWebUrl}?action=delete`,
          copy_path: `${enginePath}/${cleanSecretName}`,
          ...(isFolder ? {
            browse: `${vaultWebUrl}/ui/vault/secrets/${enginePath}/list/${cleanSecretName}`,
          } : {}),
        },
        management_info: {
          web_ui: secretWebUrl,
          api_path: `${vaultConfig.endpoint}/v1/${enginePath}/data/${cleanSecretName}`,
          metadata_path: `${vaultConfig.endpoint}/v1/${enginePath}/metadata/${cleanSecretName}`,
        }
      };
    });

    const resourceData = {
      engine: enginePath,
      secrets,
      summary: {
        total_count: secrets.length,
        folders: secrets.filter((s: any) => s.type === "folder").length,
        secrets: secrets.filter((s: any) => s.type === "secret").length,
      },
      vault_info: {
        endpoint: vaultConfig.endpoint,
        web_ui: vaultWebUrl,
        engine_url: `${vaultWebUrl}/ui/vault/secrets/${enginePath}`,
        docs: "https://www.vaultproject.io/docs/secrets/kv",
      },
      next_actions: {
        create_new_secret: `Navigate to ${vaultWebUrl}/ui/vault/secrets/${enginePath}/create`,
        browse_engine: `Visit ${vaultWebUrl}/ui/vault/secrets/${enginePath}`,
        learn_more: "Visit the Vault KV secrets engine documentation",
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
            error: `Failed to read Vault secrets: ${error.message}`,
            troubleshooting: {
              check_engine_path: "Verify the engine path exists and is mounted",
              check_vault_token: "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
              check_permissions: "Verify your Vault token has read permissions for this engine",
              example_usage: "vault://secrets/kv-v2 or vault://secrets/secret",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource template definition for vault secrets
export const vaultSecretsTemplate: ResourceTemplateDefinition = {
  title: "Vault Secrets by Engine",
  resourceTemplate: new ResourceTemplate(
    "vault://secrets/{engine}",
    {
      list: undefined,
      complete: {
        engine: async () => {
          try {
            const vaultConfig = getVaultConfig();
            const mountsResponse = await vaultApiRequest("GET", "sys/mounts", vaultConfig);
            if (mountsResponse?.data) {
              return Object.keys(mountsResponse.data).map(path => path.replace(/\/$/, ""));
            }
          } catch {
            console.warn("Could not fetch engines for completion");
          }
          return ["kv-v2", "secret", "database", "pki"];
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
