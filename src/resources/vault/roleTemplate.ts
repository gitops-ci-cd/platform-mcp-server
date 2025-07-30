import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, listRoles, readRole, readPolicy } from "../../../lib/clients/vault/index.js";

// Read callback function for vault role resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { rolePath } = variables as {
    rolePath: string
  };

  // Convert the flattened role path back to the real path
  // Format: authMethod--with--slashes--roleName -> authMethod/with/slashes/roleName
  const segments = rolePath.split("--");

  if (segments.length < 2) {
    throw new Error(`Invalid role path format: ${rolePath}. Expected format with at least one '--' separator`);
  }

  // The last segment is the role name, everything before that is the auth method path
  const roleName = segments[segments.length - 1];
  const authMethodSegments = segments.slice(0, -1);
  const authMethod = authMethodSegments.join("/");

  if (!authMethod || !roleName) {
    throw new Error(`Invalid role path format: ${rolePath}. Could not extract auth method and role name`);
  }

  try {
    const vaultConfig = getVaultConfig();
    const response = await readRole({ authMethod, name: roleName });
    const json = await response.json();

    // Determine the auth type based on the response data
    let authType = authMethod.split("/")[0]; // Default to first segment of auth method path
    if (json?.data?.auth_type) {
      // Special case: Vault uses 'iam' for AWS
      authType = json.data.auth_type === "iam" ? "aws" : json.data.auth_type;
    }

    const data = json?.data || {};

    if (data.policies) {
      data.policies = await Promise.all(
        data.policies.map((name: string) => readPolicy(name).then(p => p.json()).then(p => p.data).catch(() => name))
      );
    }

    if (data.token_policies) {
      data.token_policies = await Promise.all(
        data.token_policies.map((name: string) => readPolicy(name).then(p => p.json()).then(p => p.data).catch(() => name))
      );
    }

    return resourceResponse({
      message: `Retrieved Vault role: ${roleName} from auth method: ${authMethod}`,
      data,
      links: {
        ui: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/access/${encodeURIComponent(authMethod)}/item/role/show/${roleName}`,
        concept: "https://developer.hashicorp.com/vault/docs/auth",
        apiDocs: `https://developer.hashicorp.com/vault/api-docs/auth/${authType}`,
      },
      metadata: {
        name: roleName,
        authMethod: authMethod,
        fullPath: `${authMethod}/${roleName}`,
        potentialActions: [
          "View role configuration in Vault UI (if supported by auth method)",
          "Use Vault CLI or API for role management",
          "Review role permissions and policies",
          "Test role authentication via CLI/API"
        ],
      }
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault role ${authMethod}/${roleName}: ${error.message}`,
      links: {
        docs: "https://developer.hashicorp.com/vault/docs/auth",
        troubleshooting: "https://developer.hashicorp.com/vault/tutorials/monitoring/troubleshooting-vault",
      },
      metadata: {
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has read permissions for the auth method",
          `Check that the auth method '${authMethod}' exists and is enabled`,
          `Check that the role '${roleName}' exists in auth method '${authMethod}'`,
          "Verify the role path format is correct (authMethod/roleName)"
        ]
      }
    }, uri);
  }
};

// Resource template definition for vault roles
export const vaultRoleTemplate: ResourceTemplateDefinition = {
  title: "Vault Authentication Roles",
  resourceTemplate: new ResourceTemplate(
    "vault://roles/{rolePath}",
    {
      list: undefined,
      complete: {
        rolePath: async (value: string): Promise<string[]> => {
          const response = await listRoles(value);

          return response
            .map((path: string) => path.replace(/\//g, "--")); // Replace / with -- for URI safety
        }
      }
    }
  ),
  metadata: {
    description: "Access specific Vault authentication roles by auth method and role name. Uses -- as separator in completion (slashes in auth method paths are converted to -- for clarity).",
  },
  requiredPermissions: ["vault:read", "vault:auth:read", "admin"],
  readCallback,
};
