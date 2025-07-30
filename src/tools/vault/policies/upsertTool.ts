import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import {
  getVaultConfig,
  upsertPolicy,
} from "../../../../lib/clients/vault/index.js";

const inputSchema = z.object({
  name: z.string().describe("Policy name (must be unique and alphanumeric with dashes/underscores)"),
  policy: z.string().describe("Policy document in HCL format defining permissions (e.g., 'path \"secret/*\" { capabilities = [\"read\", \"list\"] }')"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { name, policy } = args as {
    name: string;
    policy: string;
  };

  try {
    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault policy: ${name}`);

    const vaultConfig = getVaultConfig();

    // Use the upsert function that handles all the create/update logic
    const response = await upsertPolicy({ name, policy });

    const json = await response.json();
    const data = json?.data || {};
    const message = `Vault policy '${name}' upserted successfully`;

    return toolResponse({
      message,
      data, // Raw policy data from Vault API
      links: {
        ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/policy/acl/${name}`,
        concept: "https://developer.hashicorp.com/vault/docs/concepts/policies",
        apiDocs: "https://developer.hashicorp.com/vault/api-docs/system/policy",
        cliDocs: "https://developer.hashicorp.com/vault/docs/commands/policy",
      },
      metadata: {
        name,
      }
    });

  } catch (error: any) {
    return toolResponse({
      message: `Failed to Upsert Vault policy: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/api-docs/system/policy",
        troubleshooting: "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault"
      },
      metadata: {
        name,
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set with admin permissions",
          "Verify your token has sys/policies/acl/* write capabilities",
          "Check that the policy HCL syntax is valid"
        ]
      }
    }, true);
  }
};

export const upsertVaultPolicyTool: ToolDefinition = {
  title: "Upsert Vault Policy",
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description: "Create or update a new ACL policy in HashiCorp Vault via direct API call. Policies define access permissions for authentication methods and users.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:policies:create", "admin"],
  callback
};
