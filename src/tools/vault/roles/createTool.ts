import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getVaultConfig,
  vaultApiRequest,
} from "../../../clients/vault/index.js";

// Common Vault auth method types that support roles
const VAULT_AUTH_METHODS = [
  "approle",
  "aws",
  "azure",
  "gcp",
  "kubernetes",
  "ldap",
  "oidc",
  "jwt",
  "userpass",
  "cert",
  "github",
] as const;

const inputSchema = z.object({
  authMethod: z.enum(VAULT_AUTH_METHODS).describe("Authentication method type (e.g., 'approle', 'kubernetes', 'aws')"),
  roleName: z.string().describe("Role name (must be unique within the auth method)"),
  policies: z.array(z.string()).optional().describe("List of policy names to associate with this role"),
  roleConfig: z.record(z.any()).optional().describe("Auth method-specific role configuration (e.g., bound_service_account_names for kubernetes, bound_iam_role_arn for aws)"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const {
    authMethod,
    roleName,
    policies,
    roleConfig
  } = args as {
    authMethod: string;
    roleName: string;
    policies?: string[];
    roleConfig?: Record<string, any>;
  };

  try {

    // Get authenticated user for audit logging
    getCurrentUser(`creating Vault role: ${roleName} for auth method: ${authMethod}`);

    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Prepare role configuration
    const roleConfigData: any = {
      ...roleConfig,
    };

    // Add policies if provided
    if (policies && policies.length > 0) {
      roleConfigData.policies = policies;
    }

    // Different auth methods have different role creation endpoints
    let rolePath: string;
    switch (authMethod) {
      case "approle":
        rolePath = `auth/approle/role/${roleName}`;
        break;
      case "aws":
        rolePath = `auth/aws/role/${roleName}`;
        break;
      case "azure":
        rolePath = `auth/azure/role/${roleName}`;
        break;
      case "gcp":
        rolePath = `auth/gcp/role/${roleName}`;
        break;
      case "kubernetes":
        rolePath = `auth/kubernetes/role/${roleName}`;
        break;
      case "ldap":
        rolePath = `auth/ldap/groups/${roleName}`;
        break;
      case "oidc":
      case "jwt":
        rolePath = `auth/${authMethod}/role/${roleName}`;
        break;
      case "userpass":
        rolePath = `auth/userpass/users/${roleName}`;
        break;
      case "cert":
        rolePath = `auth/cert/certs/${roleName}`;
        break;
      case "github":
        rolePath = `auth/github/map/teams/${roleName}`;
        break;
      default:
        rolePath = `auth/${authMethod}/role/${roleName}`;
    }

    let data = null;
    let message = "";

    try {
      // Check if role already exists
      const existingRole = await vaultApiRequest(
        "GET",
        rolePath,
        vaultConfig
      );
      data = existingRole?.data || existingRole;
      message = `Vault role "${roleName}" already exists for ${authMethod} auth method`;
    } catch (checkError: any) {
      // Role doesn't exist, create it
      if (!checkError.message.includes("404") && !checkError.message.includes("not found")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      // Create the role
      await vaultApiRequest(
        "POST",
        rolePath,
        vaultConfig,
        roleConfigData
      );

      // Get the role details to return comprehensive info
      try {
        const roleInfo = await vaultApiRequest(
          "GET",
          rolePath,
          vaultConfig
        );
        data = roleInfo?.data || roleInfo;
      } catch {
        // Some auth methods don't support GET on roles, that's okay
        data = roleConfigData;
      }

      message = `Vault role "${roleName}" created successfully for ${authMethod} auth method`;
    }

    return toolResponse({
      data,
      message,
      metadata: {
        role_name: roleName,
        auth_method: authMethod,
        policies: policies || [],
        role_path: rolePath,
        action: message.includes("already exists") ? "verified" : "created"
      },
      links: {
        vault: vaultConfig.endpoint
      }
    });

  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Vault role: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/docs/auth",
        troubleshooting: "https://developer.hashicorp.com/vault/docs/troubleshooting"
      },
      metadata: {
        role_name: roleName,
        auth_method: authMethod,
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
