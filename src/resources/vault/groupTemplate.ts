import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, readGroup, listGroups } from "../../../lib/clients/vault/index.js";

// Read callback function for vault group resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { groupName } = variables as {
    groupName: string
  };

  // Convert the flattened group name back to the real name (replace -- with /)
  const realGroupName = groupName.replace(/--/g, "/");

  try {
    const vaultConfig = getVaultConfig();
    const response = await readGroup(realGroupName);
    const json = await response.json();

    return resourceResponse({
      message: `Retrieved Vault access group: ${decodeURIComponent(realGroupName)}`,
      data: json.data,
      metadata: {
        name: decodeURIComponent(realGroupName),
        isSystemGroup: ["default", "root"].includes(realGroupName),
        potentialActions: [
          "Use upsertVaultGroup tool to create a similar group",
          "Edit group via Vault UI link above",
          "Review group syntax documentation for customization"
        ]
      },
      links: {
        ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/access/identity/groups/${json.data.id}/details`,
        concept: "https://developer.hashicorp.com/vault/docs/concepts/identity#identity-groups",
        apiDocs: "https://developer.hashicorp.com/vault/api-docs/secret/identity/group",
      },
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault group ${decodeURIComponent(realGroupName)}: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/api-docs/secret/identity/group",
        troubleshooting: "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault"
      },
      metadata: {
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has 'sys/groups/acl' read permissions",
          "Check that the group name exists and is spelled correctly",
          "Check Vault server connectivity and accessibility"
        ]
      }
    }, uri);
  }
};

// Resource template definition for vault groups
export const vaultGroupTemplate: ResourceTemplateDefinition = {
  title: "Vault Groups",
  resourceTemplate: new ResourceTemplate(
    "vault://groups/{groupName}",
    {
      list: undefined,
      complete: {
        groupName: async (value: string): Promise<string[]> => {
          const response = await listGroups(value);

          return response
            .map((path: string) => path.replace(/\//g, "--")); // Replace / with -- for URI safety
        }
      }
    }
  ),
  metadata: {
    description: "Access specific Vault access groups by name. Provides group details, rules, and management actions",
  },
  requiredPermissions: ["vault:read", "vault:groups:read", "admin"],
  readCallback,
};
