import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import {
  getVaultConfig,
  createPolicy,
  readPolicy,
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

    let data = null;
    let message = "";

    try {
      // Check if policy already exists
      const response = await readPolicy(name);
      data = response?.data;
      message = `Vault policy '${name}' already exists and is ready to use`;
    } catch (checkError: any) {
      // Policy doesn't exist, create it
      if (!checkError.message.includes("404") && !checkError.message.includes("not found")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      const policyConfig = {
        policy: policy,
      };

      // Create the policy
      await createPolicy(name, policyConfig);

      // Get the policy details to return comprehensive info
      const response = await readPolicy(name);
      data = response?.data;
      message = `Vault policy '${name}' created successfully`;
    }

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
      message: `Failed to create Vault policy: ${error.message}`,
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

export const createVaultPolicyTool: ToolDefinition = {
  title: "Create Vault Policy",
  description: "Create or verify a new ACL policy in HashiCorp Vault via direct API call. Idempotent operation that checks if the policy exists first. Policies define access permissions for authentication methods and users.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:policies:create", "admin"],
  callback
};
