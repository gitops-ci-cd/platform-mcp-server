import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getVaultConfig, readPolicy, listPolicies } from "../../../lib/clients/vault/index.js";

// Read callback function for vault policy resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { policyName } = variables as {
    policyName: string
  };

  // Convert the flattened policy name back to the real name (replace -- with /)
  const realPolicyName = policyName.replace(/--/g, "/");

  try {
    const vaultConfig = getVaultConfig();
    const response = await readPolicy(realPolicyName);

    return resourceResponse({
      message: `Retrieved Vault ACL policy: ${realPolicyName}`,
      data: response.data,
      metadata: {
        name: realPolicyName,
        isSystemPolicy: ["default", "root"].includes(realPolicyName),
        potentialActions: [
          "Use createVaultPolicy tool to create a similar policy",
          "Edit policy via Vault UI link above",
          "Review policy syntax documentation for customization"
        ]
      },
      links: {
        vaultUI: `${vaultConfig.endpoint.replace("/v1", "")}/ui/vault/policy/acl/${encodeURIComponent(realPolicyName)}`,
        concept: "https://www.vaultproject.io/docs/concepts/policies",
        apiDocs: "https://www.vaultproject.io/api/system/policies",
        syntax: "https://www.vaultproject.io/docs/concepts/policies#policy-syntax"
      },
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Vault policy ${realPolicyName}: ${error.message}`,
      links: {
        docs: "https://www.vaultproject.io/api/system/policies",
        troubleshooting: "https://www.vaultproject.io/docs/troubleshooting"
      },
      metadata: {
        troubleshooting: [
          "Ensure VAULT_TOKEN environment variable is set or ~/.vault-token file exists",
          "Verify your Vault token has 'sys/policies/acl' read permissions",
          `Check that the policy name '${realPolicyName}' exists and is spelled correctly`,
          "Check Vault server connectivity and accessibility"
        ]
      }
    }, uri);
  }
};

// Resource template definition for vault policies
export const vaultPoliciesTemplate: ResourceTemplateDefinition = {
  title: "Vault Policies",
  resourceTemplate: new ResourceTemplate(
    "vault://policies/{policyName}",
    {
      list: undefined,
      complete: {
        policyName: async (value: string): Promise<string[]> => {
          const list = await listPolicies(value);

          return list
            .map((path: string) => path.replace(/\//g, "--")); // Replace / with -- for URI safety
        }
      }
    }
  ),
  metadata: {
    description: "Access specific Vault ACL policies by name. Provides policy details, rules, and management actions",
  },
  requiredPermissions: ["vault:read", "vault:policies:read", "admin"],
  readCallback,
};
