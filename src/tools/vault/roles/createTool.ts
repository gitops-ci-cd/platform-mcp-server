import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import {
  getVaultConfig,
  readRole,
  createRole,
} from "../../../../lib/clients/vault/index.js";

const inputSchema = z.object({
  authMethod: z.string().describe("Authentication method type (e.g., 'approle', 'kubernetes', 'aws')"),
  roleName: z.string().describe("Role name (must be unique within the auth method)"),
  policies: z.array(z.string()).optional().describe("List of policy names to associate with this role"),
  roleConfig: z.record(z.any()).optional().describe("Auth method-specific role configuration (e.g., bound_service_account_names for kubernetes, bound_iam_role_arn for aws)"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const {
    authMethod,
    roleName,
    policies,
    roleConfig = {}
  } = args as {
    authMethod: string;
    roleName: string;
    policies?: string[];
    roleConfig?: Record<string, any>;
  };

  try {

    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault role: ${roleName} for auth method: ${authMethod}`);

    const vaultConfig = getVaultConfig();

    let data = null;
    let message = "";

    try {
      // Check if role already exists
      const response = await readRole({ authMethod, name: roleName });

      data = response?.data;
      message = `Vault role "${roleName}" already exists for ${authMethod} auth method`;
    } catch (checkError: any) {
      // Role doesn't exist, create it
      if (!checkError.message.includes("404") && !checkError.message.includes("not found")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      // Add policies if provided
      if (policies && policies.length > 0) {
        roleConfig.policies = policies;
      }

      // Create the role
      await createRole({ authMethod, name: roleName, data: roleConfig });

      // Get the role details to return comprehensive info
      const response = await readRole({ authMethod, name: roleName });
      // Some auth methods don't support GET on roles, that's okay
      data = response?.data || {};
      message = `Vault role "${roleName}" created successfully for ${authMethod} auth method`;
    }

    return toolResponse({
      data,
      message,
      metadata: {
        name: roleName,
        authMethod: authMethod,
      },
      links: {
        ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/access/${encodeURIComponent(authMethod)}/item/role/show/${roleName}`,
        concept: "https://developer.hashicorp.com/vault/docs/auth",
        apiDocs: `https://developer.hashicorp.com/vault/api-docs/auth/${authMethod}`,
      }
    });

  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Vault role: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/docs/auth",
        troubleshooting: "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault",
      },
      metadata: {
        name: roleName,
        authMethod: authMethod,
        troubleshooting: [
          "Check that the auth method is enabled in Vault",
          "Verify you have admin permissions",
          "Ensure the role name is unique within the auth method",
          "Review the role configuration for the specific auth method"
        ]
      }
    }, true);
  }
};

export const createVaultRoleTool: ToolDefinition = {
  title: "Create Vault Role",
  description: "Create or verify a new role for a specific authentication method in HashiCorp Vault via direct API call. Idempotent operation that checks if the role exists first. Roles define authentication constraints and associated policies.",
  inputSchema,
  requiredPermissions: ["vault:admin", "vault:roles:create", "admin"],
  callback
};
