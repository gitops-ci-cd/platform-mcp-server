import { z } from "zod";
import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import { getVaultConfig, readGroup, createGroup, createGroupAlias } from "../../../../lib/clients/vault/index.js";

const inputSchema = z.object({
  name: z.string().describe("Base name for the group and policies (e.g., 'my-service')"),
  groupId: z.string().describe("External group ID to alias (e.g., Azure AD group object ID)"),
  policies: z.array(z.string()).optional().describe("List of policy names to associate with this role"),
  mountAccessor: z.string().optional().describe("Vault mount accessor for the external IdP")
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { name, groupId, policies = [], mountAccessor = "auth_oidc_b81bc7ec" } = args as {
    name: string;
    groupId: string;
    policies?: string[];
    mountAccessor?: string;
  };

  try {
    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault group: ${name}`);

    const vaultConfig = getVaultConfig();

    let data = null;
    let message = "";

    try {
      const response = await readGroup(name);
      data = response?.data;
      message = `Vault group '${name}' already exists and is ready to use`;
    } catch (checkError: any) {
      // Group doesn't exist, create it
      if (!checkError.message.includes("404")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      const response = await createGroup({ name, policies });
      await new Promise(r => setTimeout(r, 3000)); // Wait for group creation to propagate

      // Create the group alias
      await createGroupAlias({
        name: groupId,
        canonicalID: response.data.id,
        mountAccessor
      });

      // Get the group details to return comprehensive info
      const groupResponse = await readGroup(name);
      data = groupResponse?.data;
      message = `Vault group '${name}' created successfully and aliased to external group '${groupId}'`;
    }

    return toolResponse({
      message,
      data,
      links: {
        ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/identity/groups`,
        concept: "https://developer.hashicorp.com/vault/docs/auth/identity",
        apiDocs: "https://developer.hashicorp.com/vault/api-docs/secret/identity/group",
        cliDocs: "https://developer.hashicorp.com/vault/docs/commands/auth"
      },
      metadata: {
        name,
        groupId,
        potentialActions: [
          "Use createVaultPolicy tool to create policies for this group",
          "Use createVaultRole tool to create roles that reference this group",
          "Use requestVaultAccess tool if you need additional permissions"
        ]
      }
    });
  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Vault group: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/api-docs/secret/identity/group",
        troubleshooting: "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault"
      },
      metadata: {
        name,
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set with admin permissions",
          "Verify your token has identity/* write capabilities",
          "Ensure the group name doesn't conflict with existing groups",
          "Check that the mount accessor is correct for your identity provider"
        ]
      }
    }, true);
  }
};

export const createVaultGroupTool: ToolDefinition = {
  title: "Create Vault Group",
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description: "Create a Vault identity group and alias it to an external group (e.g., Azure AD group) with admin policies.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:groups:create"],
  callback
};
