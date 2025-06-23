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
  const { name, policy } = args as {
    name: string;
    policy: string;
  };

  try {
    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault policy: ${name}`);

    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Prepare policy configuration
    const policyConfig = {
      policy: policy,
    };

    let data = null;
    let message = "";

    try {
      // Check if policy already exists
      const existingPolicy = await vaultApiRequest(
        "GET",
        `sys/policies/acl/${name}`,
        vaultConfig
      );
      data = existingPolicy;
      message = `Vault policy '${name}' already exists and is ready to use`;
    } catch (checkError: any) {
      // Policy doesn't exist, create it
      if (!checkError.message.includes("404") && !checkError.message.includes("not found")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

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

      data = policyInfo;
      message = `Vault policy '${name}' created successfully`;
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");

    return toolResponse({
      message,
      data, // Raw policy data from Vault API
      links: {
        manage: `${vaultWebUrl}/ui/vault/policies/acl/${name}`,
        vault: vaultWebUrl
      },
      metadata: {
        policyName: name,
        hasRules: !!policy,
        action: message.includes("already exists") ? "verified" : "created"
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
  description: "Create or verify a new ACL policy in HashiCorp Vault via direct API call. Idempotent operation that checks if the policy exists first. Policies define access permissions for authentication methods and users.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:policies:create", "admin"],
  callback
};
