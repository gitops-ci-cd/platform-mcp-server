import { ResourceDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, vaultApiRequest } from "../../clients/vault/index.js";

// Read callback function for vault policies resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Load Vault configuration
    const vaultConfig = getVaultConfig();

    // List all ACL policies
    const policiesResponse = await vaultApiRequest(
      "GET",
      "sys/policies/acl",
      vaultConfig
    );

    if (!policiesResponse?.data?.keys) {
      throw new Error("No policies data returned from Vault");
    }

    const vaultWebUrl = vaultConfig.endpoint.replace("/v1", "");

    // Transform policies data with action-oriented information
    const policies = policiesResponse.data.keys.map((policyName: string) => {
      const policyWebUrl = `${vaultWebUrl}/ui/vault/policies/acl/${policyName}`;

      return {
        name: policyName,
        type: "acl",
        actions: {
          view: policyWebUrl,
          edit: policyWebUrl,
          delete: `${policyWebUrl}?action=delete`,
          duplicate: `${vaultWebUrl}/ui/vault/policies/acl/create?template=${policyName}`,
        },
        management_info: {
          web_ui: policyWebUrl,
          api_path: `${vaultConfig.endpoint}/v1/sys/policies/acl/${policyName}`,
          docs: "https://www.vaultproject.io/docs/concepts/policies",
        }
      };
    });

    return resourceResponse({
      message: `Found ${policies.length} Vault ACL policies`,
      data: {
        policies,
        summary: {
          total_count: policies.length,
          system_policies: policies.filter((p: any) => ["default", "root"].includes(p.name)).length,
          custom_policies: policies.filter((p: any) => !["default", "root"].includes(p.name)).length,
        },
        vault_info: {
          endpoint: vaultConfig.endpoint,
          web_ui: vaultWebUrl,
          docs: "https://www.vaultproject.io/docs/concepts/policies",
        }
      },
      links: {
        vault_ui: vaultWebUrl,
        docs: "https://www.vaultproject.io/docs/concepts/policies",
        api_docs: "https://www.vaultproject.io/api/system/policies"
      },
      metadata: {
        potentialActions: [
          "Use createVaultPolicy tool to add a new ACL policy",
          "Click 'view' links above to inspect existing policies",
          "Visit the Vault documentation for policy syntax and examples"
        ]
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault policies: ${error.message}`,
      links: {
        docs: "https://www.vaultproject.io/api/system/policies",
        troubleshooting: "https://www.vaultproject.io/docs/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has 'sys/policies/acl' list permissions",
          "Check Vault server connectivity and accessibility"
        ]
      }
    }, uri);
  }
};

// Resource definition for vault policies
export const vaultPoliciesResource: ResourceDefinition = {
  uri: "vault://policies",
  title: "Vault Policies",
  metadata: {
    description: "List of all Vault ACL policies with management links",
  },
  requiredPermissions: ["vault:read", "vault:policies:list", "admin"],
  readCallback,
};
