import { z } from "zod";
import { ToolDefinition, toolResponse } from "../../registry.js";
import { createGroup, createGroupAlias } from "../../../../lib/clients/vault/client.js";

const inputSchema = z.object({
  name: z.string().describe("Base name for the group and policies (e.g., 'my-service')"),
  groupId: z.string().describe("External group ID to alias (e.g., Azure AD group object ID)"),
  policies: z.array(z.string()).optional().describe("List of policy names to associate with this role"),
  mountAccessor: z.string().optional().describe("Vault mount accessor for the external IdP")
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { name, groupId, policies, mountAccessor = "auth_oidc_b81bc7ec" } = args as {
    name: string;
    groupId: string;
    policies: string[];
    mountAccessor: string;
  };

  const response = await createGroup({ name, policies });
  await new Promise(r => setTimeout(r, 3000)); // Wait for group creation to propagate
  await createGroupAlias({
    name: groupId,
    canonicalID: response.data.id,
    mountAccessor
  });

  return toolResponse({
    data: response.data,
    message: `Vault group '${name}' created and aliased to external group '${groupId}'.`,
    metadata: {
      name: name,
      "group-alias": response.data.id,
    },
    links: {
      ui: `${process.env.VAULT_ADDR}/ui/identity/groups`,
    }
  });
};

export const createVaultGroupTool: ToolDefinition = {
  title: "Create Vault Group",
  description: "Create a Vault identity group and alias it to an external group (e.g., Azure AD group) with admin policies.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:groups:create"],
  callback
};
