import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import {
  getArgoCDConfig,
  argoCDApiRequest
} from "../../../../lib/clients/argocd/index.js";

const inputSchema = z.object({
  name: z.string().describe("Project name"),
  description: z.string().optional().describe("Human-readable description of the project"),
  sourceRepos: z.array(z.string()).describe("List of Git repositories this project can access (* for all)"),
  destinations: z.array(z.object({
    server: z.string().describe("Kubernetes cluster server URL"),
    namespace: z.string().optional().describe("Target namespace (* for all namespaces)")
  })).describe("List of allowed deployment destinations"),
  parameters: z.record(z.any()).optional().describe("Additional project parameters (resource restrictions, roles, RBAC policies, etc.)")
});

const resultSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal("AppProject"),
  metadata: z.object({
    name: z.string(),
    namespace: z.string()
  }).passthrough(),
  spec: z.object({
    description: z.string().optional(),
    sourceRepos: z.array(z.string()),
    destinations: z.array(z.object({
      server: z.string(),
      namespace: z.string().optional()
    }).passthrough())
  }).passthrough()
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { name, description, sourceRepos, destinations, parameters } = args as {
    name: string;
    description?: string;
    sourceRepos: string[];
    destinations: Array<{
      server: string;
      namespace?: string;
    }>;
    parameters?: Record<string, any>;
  };

  try {
    // Get authenticated user for audit logging
    const user = getCurrentUser(`creating ArgoCD project: ${name}`);

    // Load ArgoCD configuration
    const argoCDConfig = getArgoCDConfig();

    let data = null;
    let message = "";

    try {
      const existingProject = await argoCDApiRequest(
        "GET",
        `projects/${name}`,
        argoCDConfig
      );
      data = existingProject;
      message = `ArgoCD project '${name}' already exists and is ready to use`;
    } catch (checkError: any) {
      // Project doesn't exist, create it
      if (!checkError.message.includes("404") && !checkError.message.includes("not found")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      // Use sampling to generate the ArgoCD project configuration
      const response = await extra.sendRequest(
        {
          method: "sampling/createMessage",
          params: {
            messages: [
              {
                role: "user",
                content: {
                  type: "text",
                  text: `Generate an ArgoCD project configuration for:
- Name: ${name}
- Description: ${description || `ArgoCD project ${name}`}
- Source repositories: ${JSON.stringify(sourceRepos, null, 2)}
- Deployment destinations: ${JSON.stringify(destinations, null, 2)}
- Additional parameters: ${JSON.stringify(parameters || {}, null, 2)}

Please generate a complete ArgoCD project spec following these guidelines:
1. Configure appropriate resource restrictions based on the parameters (if any)
2. Set up RBAC roles and policies if specified in parameters
3. Configure orphaned resource detection if needed
4. Follow ArgoCD best practices for project security and multi-tenancy
5. Apply sensible defaults for any unspecified security policies

Return the complete ArgoCD project configuration as a standard Kubernetes resource with:
- apiVersion: current ArgoCD API version (e.g., argoproj.io/v1alpha1)
- kind: AppProject
- metadata: including name (${name}), namespace (argocd), labels, and annotations (user: ${user.email})
- spec: complete ArgoCD project specification`
                }
              }
            ],
            maxTokens: 3072
          }
        },
        resultSchema
      );

      // Create the project
      data = await argoCDApiRequest(
        "POST",
        "projects",
        argoCDConfig,
        response
      );

      message = `ArgoCD project '${name}' created successfully`;
    }

    const argoWebUrl = argoCDConfig.endpoint.replace("/api/v1", "");
    const projectWebUrl = `${argoWebUrl}/settings/projects/${name}`;

    return toolResponse({
      message,
      data,
      links: {
        manage: projectWebUrl,
        applications: `${argoWebUrl}/applications?proj=${name}`,
        settings: `${projectWebUrl}/summary`,
        roles: `${projectWebUrl}/roles`,
        docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/projects/"
      },
      metadata: {
        potentialActions: [
          "Use createArgoCDApplication tool to create applications in this project",
          "Configure additional RBAC roles and policies via ArgoCD UI",
          "Set up resource restrictions and security policies"
        ]
      }
    });

  } catch (error: any) {
    return toolResponse({
      message: `Failed to create ArgoCD project: ${error.message}`,
      links: {
        docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/projects/",
        troubleshooting: "https://argo-cd.readthedocs.io/en/stable/operator-manual/troubleshooting/"
      },
      metadata: {
        troubleshooting: [
          "Ensure ARGOCD_TOKEN environment variable is set with appropriate permissions",
          "Verify your token has projects create/read permissions",
          "Check that the project name is DNS-compliant and unique",
          "Verify source repositories and destination clusters are accessible"
        ]
      }
    }, true);
  }
};

export const createArgoCDProjectTool: ToolDefinition = {
  title: "Create ArgoCD Project",
  description: "Create a new project in ArgoCD via direct API call. Projects provide multi-tenancy with RBAC, resource restrictions, and repository access control.",
  inputSchema,
  requiredPermissions: ["argocd:admin", "argocd:projects:create", "admin"],
  callback
};
