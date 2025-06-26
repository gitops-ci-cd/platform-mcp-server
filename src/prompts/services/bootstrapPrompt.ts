import { z } from "zod";

import { PromptDefinition } from "../registry.js";
import { listClusters } from "../../../lib/clients/kubernetes/index.js";

const argsSchema = z.object({
  name: z.string().describe("Name of the service to bootstrap (e.g., 'my-service')"),
  idea: z.string().describe("Describe the business purpose or high-level idea for the service."),
  language: z.enum(listClusters() as [string, ...string[]]).describe("Programming language for the service."),
});

const callback: PromptDefinition["callback"] = async (args: any, _extra: any) => {
  const {
    name,
    idea,
    language,
  } =  args as {
    name: string;
    idea: string;
    language: string
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
- Use the Application Platform MCP Server to:
  - Setup Vault with:
    - secrets engines:
      - '${name}-dev'
      - '${name}-qa'
      - '${name}-prd'
    - policies:
      - '${name}-dev-read' with read/list access to ${name}-dev/*, ${name}-qa/*
      - '${name}-dev-admin' with full CRUD access to ${name}-dev/*, ${name}-qa/*
      - '${name}-prd-read' with read/list access to ${name}-prd/*
      - '${name}-prd-admin' with full CRUD access to ${name}-prd/*
    - roles to be used within kubernetes:
      - '${name}-usw2-dev' bound to
      - '${name}-usw2-qa'
      - '${name}-usw2-prd'
  - Create an Artifactory repository for the service
  - Create an ArgoCD application and project for the service
  - Create an Entra (Azure AD) group for the service team
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
  description: "Ask your AI assistant to help you take an idea to production using only MCP server tooling.",
  callback,
  argsSchema,
};
