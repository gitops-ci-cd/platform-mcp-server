import { ResourceDefinition, resourceResponse } from "../registry.js";
import { getArgoCDConfig, argoCDApiRequest } from "../../../lib/clients/argocd/index.js";

// Read callback function for ArgoCD projects resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Load ArgoCD configuration
    const argoCDConfig = getArgoCDConfig();

    // List all projects
    const projectsResponse = await argoCDApiRequest(
      "GET",
      "projects",
      argoCDConfig
    );

    if (!projectsResponse?.items) {
      throw new Error("No projects data returned from ArgoCD");
    }

    const argoCDWebUrl = argoCDConfig.endpoint;

    // Transform projects data with action-oriented information
    const projects = projectsResponse.items.map((project: any) => {
      const projectName = project.metadata?.name || "unknown";
      const projectWebUrl = `${argoCDWebUrl}/settings/projects/${projectName}`;

      return {
        name: projectName,
        description: project.spec?.description || "",
        sourceRepos: project.spec?.sourceRepos || [],
        destinations: project.spec?.destinations || [],
        clusterResourceWhitelist: project.spec?.clusterResourceWhitelist || [],
        namespaceResourceWhitelist: project.spec?.namespaceResourceWhitelist || [],
        roles: project.spec?.roles || [],
        actions: {
          view: projectWebUrl,
          applications: `${argoCDWebUrl}/applications?projects=${projectName}`,
          settings: `${projectWebUrl}/settings`,
          edit: `${projectWebUrl}/edit`,
        },
        management_info: {
          web_ui: projectWebUrl,
          api_path: `${argoCDConfig.endpoint}/api/v1/projects/${projectName}`,
        }
      };
    });

    const resourceData = {
      projects,
      summary: {
        total_count: projects.length,
        with_source_repos: projects.filter((p: any) => p.sourceRepos.length > 0).length,
        with_destinations: projects.filter((p: any) => p.destinations.length > 0).length,
        with_roles: projects.filter((p: any) => p.roles.length > 0).length,
      },
      argocd_info: {
        endpoint: argoCDConfig.endpoint,
        web_ui: argoCDWebUrl,
        docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/projects/",
      },
    };

    return resourceResponse({
      message: "Successfully retrieved ArgoCD projects",
      data: resourceData,
      metadata: {
        totalCount: projects.length,
        withSourceRepos: resourceData.summary.with_source_repos,
        withDestinations: resourceData.summary.with_destinations,
        withRoles: resourceData.summary.with_roles,
      },
      links: {
        "ArgoCD Web UI": argoCDWebUrl,
        "ArgoCD Projects Documentation": "https://argo-cd.readthedocs.io/en/stable/user-guide/projects/",
        "ArgoCD API Documentation": "https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/",
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read ArgoCD projects: ${error.message}`,
      metadata: {
        troubleshooting: [
          "Ensure ARGOCD_TOKEN environment variable is set",
          "Verify your ArgoCD token has 'projects' list permissions",
        ],
      },
      links: {
        "ArgoCD API Documentation": "https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/",
      }
    }, uri);
  }
};

// Resource definition for ArgoCD projects
export const argoCDProjectsResource: ResourceDefinition = {
  uri: "argocd://projects",
  title: "argoCD Projects",
  metadata: {
    description: "List of all ArgoCD projects with management links and configuration details",
  },
  requiredPermissions: ["argocd:read", "argocd:projects:list", "admin"],
  readCallback,
};
