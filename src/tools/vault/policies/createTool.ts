import { z } from "zod";
import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getVaultConfig,
  vaultApiRequest,
} from "../../../clients/vault/index.js";

const inputSchema = z.object({
  name: z.string().describe("Policy name (must be unique and alphanumeric with dashes/underscores)"),
  policy: z.string().describe("Policy document in HCL format defining permissions (e.g., 'path \"secret/*\" { capabilities = [\"read\", \"list\"] }')"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const { name, policy } = args as {
      name: string;
      policy: string;
    };

    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault policy: ${name}`);

    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Prepare policy configuration
    const policyConfig = {
      policy: policy,
    };

    // Create the policy
    await vaultApiRequest(
      "PUT",
      `sys/policies/acl/${name}`,
      vaultConfig,
      policyConfig
    );

    // Get the policy details to return comprehensive info
    const policyInfo = await vaultApiRequest(
      "GET",
      `sys/policies/acl/${name}`,
      vaultConfig
    );

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");

    return toolResponse({
      message: `Vault policy '${name}' created successfully`,
      data: policyInfo, // Raw policy data from Vault API
      links: {
        manage: `${vaultWebUrl}/ui/vault/policies/acl/${name}`,
        vault: vaultWebUrl
      },
      metadata: {
        policyName: name,
        hasRules: !!policy
      }
    });

  } catch (error: any) {
    const errorData = {
      error: `Failed to create Vault policy: ${error.message}`,
      details: error.stack || error.toString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(errorData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: errorData,
      isError: true
    };
  }
};

export const createVaultPolicyTool: ToolDefinition = {
  title: "Create Vault Policy",
  description: "Create a new ACL policy in HashiCorp Vault via direct API call. Policies define access permissions for authentication methods and users.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:policies:create", "admin"],
  callback
};
