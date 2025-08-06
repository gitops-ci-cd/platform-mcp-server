import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import { getVaultConfig, upsertRole } from "../../../../lib/clients/vault/index.js";

const inputSchema = z.object({
  authMethod: z
    .string()
    .describe("Authentication method type (e.g., 'approle', 'kubernetes', 'aws')"),
  roleName: z.string().describe("Role name (must be unique within the auth method)"),
  policies: z
    .array(z.string())
    .optional()
    .describe("List of policy names to associate with this role"),
  roleConfig: z
    .record(z.any())
    .optional()
    .describe(
      "Auth method-specific role configuration (e.g., bound_service_account_names for kubernetes, bound_iam_role_arn for aws)"
    ),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const {
    authMethod,
    roleName,
    policies,
    roleConfig = {},
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

    // Add policies if provided
    if (policies && policies.length > 0) {
      roleConfig.policies = policies;
    }

    // Use the upsert function that handles all the create/update logic
    const response = await upsertRole({
      authMethod,
      name: roleName,
      data: roleConfig,
    });

    const json = await response.json();
    const data = json?.data || {};
    const message =
      response.status === 201
        ? `Vault role '${authMethod}/${roleName}' created successfully.`
        : `Vault role '${authMethod}/${roleName}' already exists. Updated successfully.`;

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
      },
    });
  } catch (error: any) {
    return toolResponse(
      {
        message: `Failed to Upsert Vault role: ${error.message}`,
        links: {
          docs: "https://developer.hashicorp.com/vault/docs/auth",
          troubleshooting:
            "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault",
        },
        metadata: {
          name: roleName,
          authMethod: authMethod,
          troubleshooting: [
            "Check that the auth method is enabled in Vault",
            "Verify you have admin permissions",
            "Ensure the role name is unique within the auth method",
            "Review the role configuration for the specific auth method",
          ],
        },
      },
      true
    );
  }
};

export const upsertVaultRoleTool: ToolDefinition = {
  title: "Upsert Vault Role",
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description:
    "Create or update a new role for a specific authentication method in HashiCorp Vault via direct API call. Roles define authentication constraints and associated policies.",
  inputSchema,
  requiredPermissions: [],
  callback,
};
