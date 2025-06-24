import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";
import { completionCache } from "../../utils/completion-cache.js";

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
    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // Get specific role details - try both 'role' and 'roles' endpoints
    let response;
    try {
      response = await vaultApiRequest(
        "GET",
        `auth/${authMethod}/role/${roleName}`,
        vaultConfig
      );
    } catch {
      // If 'role' fails, try 'roles' (different auth methods use different endpoints)
      response = await vaultApiRequest(
        "GET",
        `auth/${authMethod}/roles/${roleName}`,
        vaultConfig
      );
    }

    if (!response?.data) {
      throw new Error(`Role '${roleName}' not found in auth method '${authMethod}' or no data returned`);
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");

    // Determine the auth type based on the response data
    let authType = authMethod.split("/")[0]; // Default to first segment of auth method path
    if (response?.data?.auth_type) {
      // Special case: Vault uses 'iam' for AWS
      authType = response.data.auth_type === "iam" ? "aws" : response.data.auth_type;
    }

    return resourceResponse({
      message: `Retrieved Vault role: ${roleName} from auth method: ${authMethod}`,
      data: response.data,
      links: {
        vaultUI: `${vaultWebUrl}/ui/vault/access/${encodeURIComponent(authMethod)}/item/role/show/${roleName}`,
        concept: "https://www.vaultproject.io/docs/auth",
        apiDocs: `https://www.vaultproject.io/api/auth/${authType}`,
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
        docs: "https://www.vaultproject.io/docs/auth",
        troubleshooting: "https://www.vaultproject.io/docs/troubleshooting"
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
export const vaultRolesTemplate: ResourceTemplateDefinition = {
  title: "Vault Authentication Roles",
  resourceTemplate: new ResourceTemplate(
    "vault://roles/{rolePath}",
    {
      list: undefined,
      complete: {
        rolePath: async (value: string): Promise<string[]> => {
          try {
            // Check cache first - cache all roles regardless of search argument
            const cacheKey = "vault-roles";
            const cachedResults = completionCache.get(cacheKey);
            if (cachedResults) {
              // Filter based on user input (case-insensitive)
              const filtered = value
                ? cachedResults.filter(role =>
                  role.toLowerCase().includes(value.toLowerCase())
                )
                : cachedResults;

              console.log(`[Vault Roles] Completion for "${value}": ${filtered.length} matches (of ${cachedResults.length} total roles)`);
              if (value && filtered.length <= 10) {
                console.log(`[Vault Roles] Filtered results: ${filtered.join(", ")}`);
              }

              return filtered;
            }

            const vaultConfig = getVaultConfig();

            // List auth methods to find role-enabled backends
            const authMethodsResponse = await vaultApiRequest("GET", "sys/auth", vaultConfig);

            let allRoles: string[] = [];

            // Check each auth method for roles
            for (const [path, authMethod] of Object.entries(authMethodsResponse.data)) {
              const cleanPath = path.replace(/\/$/, "");
              const authType = (authMethod as any).type;

              // Only check auth methods that support roles
              if (["kubernetes", "aws", "azure", "gcp", "jwt", "oidc", "ldap", "approle", "userpass"].includes(authType)) {
                // For Kubernetes and other auth methods, try both 'role' and 'roles' endpoints
                let rolesResponse;
                try {
                  rolesResponse = await vaultApiRequest(
                    "LIST",
                    `auth/${cleanPath}/role`,
                    vaultConfig
                  );
                } catch {
                  // If 'role' fails, try 'roles' (different auth methods use different endpoints)
                  try {
                    rolesResponse = await vaultApiRequest(
                      "LIST",
                      `auth/${cleanPath}/roles`,
                      vaultConfig
                    );
                  } catch {
                    // Skip auth methods that don't support roles or we can't access
                    continue;
                  }
                }

                if (rolesResponse?.data?.keys) {
                  const roles = rolesResponse.data.keys.map((roleName: string) => {
                    // Convert slashes in auth method path to -- for UI clarity
                    const flattenedAuthMethod = cleanPath.replace(/\//g, "--");
                    return `${flattenedAuthMethod}--${roleName}`;
                  });
                  allRoles.push(...roles);
                }
              }
            }

            const sortedRoles = allRoles.sort();

            // Cache the results for 30 minutes (30 * 60 * 1000 ms)
            completionCache.set(cacheKey, sortedRoles, 30 * 60 * 1000);

            return sortedRoles;
          } catch {
            console.warn("Could not fetch roles for completion");
            return [];
          }
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
