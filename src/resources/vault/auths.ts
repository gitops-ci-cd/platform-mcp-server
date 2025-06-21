import { ResourceDefinition } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";

// Read callback function for Vault auth methods resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // List all auth methods
    const authMethodsResponse = await vaultApiRequest("GET", "sys/auth", vaultConfig);

    if (!authMethodsResponse?.data) {
      throw new Error("No auth methods data returned from Vault");
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");

    // Transform auth methods data with action-oriented information
    const authMethods = Object.entries(authMethodsResponse.data).map(([path, authMethod]: [string, any]) => {
      const cleanPath = path.replace(/\/$/, "");
      const authWebUrl = `${vaultWebUrl}/ui/vault/access/${cleanPath}`;

      return {
        path: cleanPath,
        type: authMethod.type,
        description: authMethod.description || "",
        accessor: authMethod.accessor,
        local: authMethod.local || false,
        seal_wrap: authMethod.seal_wrap || false,
        external_entropy_access: authMethod.external_entropy_access || false,
        options: authMethod.options || {},
        actions: {
          view: authWebUrl,
          configure: `${authWebUrl}/configuration`,
          roles: `${authWebUrl}/roles`,
          disable: `${authWebUrl}?action=disable`,
        },
        management_info: {
          web_ui: authWebUrl,
          api_path: `${vaultConfig.endpoint}/auth/${cleanPath}`,
          sys_path: `${vaultConfig.endpoint}/sys/auth/${cleanPath}`,
          type: authMethod.type,
        }
      };
    });

    const resourceData = {
      auth_methods: authMethods,
      summary: {
        total_count: authMethods.length,
        by_type: authMethods.reduce((acc: any, auth: any) => {
          acc[auth.type] = (acc[auth.type] || 0) + 1;
          return acc;
        }, {}),
        local_methods: authMethods.filter((auth: any) => auth.local).length,
        external_methods: authMethods.filter((auth: any) => !auth.local).length,
        seal_wrapped: authMethods.filter((auth: any) => auth.seal_wrap).length,
      },
      vault_info: {
        endpoint: vaultConfig.endpoint,
        web_ui: vaultWebUrl,
        auth_methods_url: `${vaultWebUrl}/ui/vault/access`,
        docs: "https://www.vaultproject.io/docs/auth",
      },
      next_actions: {
        enable_new_auth_method: `Visit ${vaultWebUrl}/ui/vault/access to enable a new authentication method`,
        configure_existing: "Click 'configure' links to modify auth method settings",
        manage_roles: "Click 'roles' links to manage roles for auth methods that support them",
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
            error: `Failed to read Vault auth methods: ${error.message}`,
            troubleshooting: {
              check_vault_token: "Ensure VAULT_TOKEN environment variable is set",
              check_permissions: "Verify your Vault token has read permissions for sys/auth",
              vault_docs: "https://www.vaultproject.io/docs/auth",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource definition for Vault auth methods
export const vaultAuthMethodsResource: ResourceDefinition = {
  uri: "vault://auth",
  name: "vaultAuthMethods",
  metadata: {
    name: "Vault Authentication Methods",
    description: "List of all enabled Vault authentication methods with configuration details",
  },
  requiredPermissions: ["vault:read", "vault:auth:list", "admin"],
  readCallback,
};
