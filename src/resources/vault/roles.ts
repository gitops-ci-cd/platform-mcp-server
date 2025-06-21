import { ResourceDefinition } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";

// Read callback function for Vault roles resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // List auth methods to find role-enabled backends
    const authMethodsResponse = await vaultApiRequest("GET", "sys/auth", vaultConfig);

    if (!authMethodsResponse?.data) {
      throw new Error("No auth methods data returned from Vault");
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");
    let allRoles: any[] = [];

    // Check each auth method for roles
    for (const [path, authMethod] of Object.entries(authMethodsResponse.data)) {
      const cleanPath = path.replace(/\/$/, "");
      const authType = (authMethod as any).type;

      // Only check auth methods that support roles
      if (["kubernetes", "aws", "azure", "gcp", "jwt", "oidc", "ldap"].includes(authType)) {
        try {
          const rolesResponse = await vaultApiRequest(
            "GET",
            `auth/${cleanPath}/roles?list=true`,
            vaultConfig
          );

          if (rolesResponse?.data?.keys) {
            const roles = rolesResponse.data.keys.map((roleName: string) => ({
              name: roleName,
              auth_method: cleanPath,
              auth_type: authType,
              actions: {
                view: `${vaultWebUrl}/ui/vault/access/${cleanPath}/roles/${roleName}`,
                edit: `${vaultWebUrl}/ui/vault/access/${cleanPath}/roles/${roleName}/edit`,
                test: `${vaultWebUrl}/ui/vault/access/${cleanPath}/roles/${roleName}/test`,
              },
              management_info: {
                web_ui: `${vaultWebUrl}/ui/vault/access/${cleanPath}/roles/${roleName}`,
                api_path: `${vaultConfig.endpoint}/auth/${cleanPath}/role/${roleName}`,
                auth_method_path: `${vaultConfig.endpoint}/auth/${cleanPath}`,
              }
            }));
            allRoles.push(...roles);
          }
        } catch (error) {
          // Skip auth methods that don't support roles or we can't access
          console.warn(`Could not fetch roles for auth method ${cleanPath}: ${error}`);
        }
      }
    }

    const resourceData = {
      roles: allRoles,
      summary: {
        total_count: allRoles.length,
        by_auth_type: allRoles.reduce((acc: any, role: any) => {
          acc[role.auth_type] = (acc[role.auth_type] || 0) + 1;
          return acc;
        }, {}),
        by_auth_method: allRoles.reduce((acc: any, role: any) => {
          acc[role.auth_method] = (acc[role.auth_method] || 0) + 1;
          return acc;
        }, {}),
      },
      vault_info: {
        endpoint: vaultConfig.endpoint,
        web_ui: vaultWebUrl,
        auth_methods_url: `${vaultWebUrl}/ui/vault/access`,
        docs: "https://www.vaultproject.io/docs/auth",
      },
      next_actions: {
        create_new_role: "Navigate to an auth method in the Vault UI and create a new role",
        manage_auth_methods: `Visit ${vaultWebUrl}/ui/vault/access to manage authentication methods`,
        learn_more: "Visit the Vault authentication documentation",
      }
    };

    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify(resourceData, null, 2)
        }
      ]
    };

  } catch (error: any) {
    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify({
            error: `Failed to read Vault roles: ${error.message}`,
            troubleshooting: {
              check_vault_token: "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
              check_permissions: "Verify your Vault token has read permissions for auth methods",
              check_auth_methods: "Ensure auth methods are enabled and configured",
              vault_docs: "https://www.vaultproject.io/docs/auth",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource definition for Vault roles
export const vaultRolesResource: ResourceDefinition = {
  uri: "vault://roles",
  name: "vaultRoles",
  metadata: {
    name: "Vault Roles",
    description: "List of all Vault authentication roles across all auth methods",
  },
  requiredPermissions: ["vault:read", "vault:auth:list", "admin"],
  readCallback,
};
