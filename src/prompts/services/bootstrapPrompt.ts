import { z } from "zod";

import { PromptDefinition } from "../registry.js";
import { listClusters } from "../../../lib/clients/kubernetes/index.js";

const argsSchema = z.object({
  name: z.string().describe("Name of the service to bootstrap (e.g., 'my-service')"),
  idea: z.string().describe("Describe the business purpose or high-level idea for the service."),
  language: z.string().describe("Programming language for the service."),
  devCluster: z
    .enum(listClusters() as [string, ...string[]])
    .describe("Kubernetes cluster for the development environment."),
  prdCluster: z
    .enum(listClusters() as [string, ...string[]])
    .describe("Kubernetes cluster for the production environment."),
});

const callback: PromptDefinition["callback"] = async (args: any, _extra: any) => {
  const { name, idea, language, devCluster, prdCluster } = args as {
    name: string;
    idea: string;
    language: string;
    devCluster: string;
    prdCluster: string;
  };

  const vaultSetup = {
    secretEngines: [
      {
        name: `${name}-dev`,
        type: "kv-v2",
        description: `Development secrets for ${name}`,
      },
      {
        name: `${name}-qa`,
        type: "kv-v2",
        description: `QA secrets for ${name}`,
      },
      {
        name: `${name}-prd`,
        type: "kv-v2",
        description: `Production secrets for ${name}`,
      },
    ],
    policies: [
      {
        name: `${name}-dev-read`,
        policy: `
          path ${name}-dev/* {
            capabilities = ["read", "list"]
          }
          path ${name}-qa/* {
            capabilities = ["read", "list"]
          }
        `,
      },
      {
        name: `${name}-dev-admin`,
        policy: `
          path ${name}-dev/* {
            capabilities = ["create", "read", "update", "delete", "list"]
          }
          path ${name}-qa/* {
            capabilities = ["create", "read", "update", "delete", "list"]
          }
        `,
      },
      {
        name: `${name}-prd-read`,
        policy: `
          path ${name}-prd/* {
            capabilities = ["read", "list"]
          }
        `,
      },
      {
        name: `${name}-prd-admin`,
        policy: `
          path ${name}-prd/* {
            capabilities = ["create", "read", "update", "delete", "list"]
          }
        `,
      },
      {
        name: `legalzoom-${name}-gh-actions`,
        policy: `
          path "artifactory/token/github-actions" {
            capabilities = ["read"]
          }
          path "github-app/token" {
            capabilities = ["read"]
            required_parameters = ["org_name", "repositories"]
            allowed_parameters = {
              "org_name"= ["legalzoom"]
              "repositories" = ["${name}-deployment"]
            }
          }
          path "argocd/${name}/github-actions-le" {
            capabilities = ["read"]
          }
          path "argocd/${name}/github-actions-prod" {
            capabilities = ["read"]
          }
        `,
      },
    ],
    roles: [
      {
        authMethod: `kubernetes/${devCluster}`,
        roleName: `${name}-usw2-dev`,
        policies: [`${name}-dev-read`],
        roleConfig: {
          bound_service_account_names: "*",
          bound_service_account_namespaces: `${name}-usw2-dev`,
          ttl: "1h",
        },
      },
      {
        authMethod: `kubernetes/${devCluster}`,
        roleName: `${name}-usw2-qa`,
        policies: [`${name}-dev-read`],
        roleConfig: {
          bound_service_account_names: "*",
          bound_service_account_namespaces: `${name}-usw2-qa`,
          ttl: "1h",
        },
      },
      {
        authMethod: `kubernetes/${prdCluster}`,
        roleName: `${name}-usw2-prd`,
        policies: [`${name}-prd-read`],
        roleConfig: {
          bound_service_account_names: "*",
          bound_service_account_namespaces: `${name}-usw2-prd`,
          ttl: "1h",
        },
      },
    ],
    groups: [
      {
        name: `${name} admins`,
        groupId: "Inferred from Azure AD group object ID",
        policies: [`${name}-dev-admin`, `${name}-prd-admin`],
      },
    ],
    markKubernetesRoleAdmin: [
      {
        cluster: devCluster,
        role: `${name}-usw2-dev`,
      },
      {
        cluster: devCluster,
        role: `${name}-usw2-qa`,
      },
      {
        cluster: prdCluster,
        role: `${name}-usw2-prd`,
      },
    ],
  };

  return {
    messages: [
      {
        role: "system",
        content: {
          type: "text",
          text: `You are an AI agent responsible for bootstrapping a new microservice using only MCP server tooling. Your workflow must be fully automated and idempotent, and should leverage the following:

- Use the GitHub MCP server to:
  - Use the GitHub template 'legalzoom/k8s-deployment-template' to create 'legalzoom/${name}-deployment'.
  - Verify with the user to see if they have a repo they'd like to use, otherwise use the GitHub template 'legalzoom/${language}-backend-template' to create 'legalzoom/${name}'.
  - Trigger repository_dispatch events to run cookiecutter in each new repo.
- Use the DevEx MCP Server to:
  - Set up Vault with ${JSON.stringify(vaultSetup, null, 2)}.

  - Set up Artifactory with:
    - repository:
      TODO
      - '${name}-dev'
      - '${name}-qa'
      - '${name}-prd'
  - Set up ArgoCD with:
    - projects:
      - TODO
    - applications:
      - TODO
  - Set up Entra (Azure AD) with:
    - groups:
      - TODO

- Ensure all resource creation is idempotent and return links to all created resources.
- If any step is not yet automated, output a clear TODO or manual instruction.
- Reference the Backstage templates only for inspiration; do not use Backstage or Jenkins in the workflow.

The service to bootstrap is called '${name}' and the business idea is: ${idea}.

Please provide a step-by-step plan, referencing the specific MCP tools/resources to use for each step, and include any relevant links or next actions for the user.`,
        },
      },
    ],
  };
};

export const serviceBootstrapPrompt: PromptDefinition = {
  title: "Service Bootstrap",
  description:
    "Ask your AI assistant to help you take an idea to production using only MCP server tooling.",
  callback,
  argsSchema,
  requiredPermissions: []
};
