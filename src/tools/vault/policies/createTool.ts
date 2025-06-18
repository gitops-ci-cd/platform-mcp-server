import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getUserInfo } from "../../../auth/index.js";
import {
  getVaultConfig,
  vaultApiRequest,
} from "../utils.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const { name, policy } = args as {
      name: string;
      policy: string;
    };

    // Get authenticated user for audit logging
    const user = getUserInfo();
    console.log(`User ${user.email} (${user.id}) creating Vault policy: ${name}`);

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

    const successData = {
      success: true,
      policy: {
        name,
        policy: policyInfo?.data?.policy || policy,
        rules: policyInfo?.data?.rules || policy,
      },
      vault_endpoint: vaultConfig.endpoint,
      created_by: user.email,
      created_at: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(successData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: successData,
    };

  } catch (error: any) {
    const errorData = {
      error: `Failed to create Vault policy: ${error.message}`,
      status: "error",
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
  name: "createVaultPolicy",
  description: "Create a new ACL policy in HashiCorp Vault via direct API call. Policies define access permissions for authentication methods and users.",
  inputSchema: z.object({
    name: z.string().describe("Policy name (must be unique and alphanumeric with dashes/underscores)"),
    policy: z.string().describe("Policy document in HCL format defining permissions (e.g., 'path \"secret/*\" { capabilities = [\"read\", \"list\"] }')"),
  }),
  requiredPermissions: ["vault:admin", "vault:policies:create", "admin"],
  callback
};
