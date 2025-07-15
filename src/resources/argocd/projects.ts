import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getArgoCDConfig, readProject, listProjects } from "../../../lib/clients/argocd/index.js";

// Read callback function for ArgoCD project resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables, _extra) => {
  const { projectName } = variables as { projectName: string };

  try {
    // Get project using client convenience method
    const data = await readProject(projectName);

    // Load ArgoCD configuration for URL building
    const argoCDConfig = getArgoCDConfig();
    const argoCDWebUrl = argoCDConfig.endpoint;
    const projectWebUrl = `${argoCDWebUrl}/settings/projects/${projectName}`;

    return resourceResponse({
      message: `Retrieved ArgoCD Project: ${data.name}`,
      data,
      links: {
        ui: projectWebUrl,
        applications: `${argoCDWebUrl}/applications?projects=${projectName}`,
        api: `${argoCDWebUrl}/api/v1/projects/${projectName}`,
        docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/projects/"
      },
      metadata: {
        name: data.name,
        potentialActions: [
          "Use createArgoCDProject tool to create similar projects",
          "Click 'applications' link to view applications in this project",
          "Review sourceRepos and destinations for allowed resources",
          "Check roles array for RBAC configuration"
        ]
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read ArgoCD project: ${error.message}`,
      links: {
        docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/projects/",
        troubleshooting: "https://argo-cd.readthedocs.io/en/stable/faq/"
      },
      metadata: {
        troubleshooting: [
          "Verify the project name exists in ArgoCD",
          "Ensure ARGOCD_TOKEN environment variable is set",
          "Verify your ArgoCD token has 'projects' read permissions",
          "Check ArgoCD API connectivity and service status"
        ]
      }
    }, uri);
  }
};

// Resource template definition for ArgoCD projects
export const argoCDProjectsTemplate: ResourceTemplateDefinition = {
  title: "ArgoCD Projects",
  resourceTemplate: new ResourceTemplate(
    "argocd://projects/{projectName}",
    {
      list: undefined,
      complete: {
        projectName: async (value: string): Promise<string[]> => {
          const response = await listProjects(value);

          return response;
        }
      }
    }
  ),
  metadata: {
    description: "Access specific ArgoCD projects by name. Provides project details, RBAC configuration, and resource restrictions",
  },
  requiredPermissions: ["argocd:read", "argocd:projects:read", "admin"],
  readCallback,
};
