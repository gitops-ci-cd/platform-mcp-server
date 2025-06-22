import { ResourceDefinition } from "../registry.js";
import { getArgoCDConfig, argoCDApiRequest } from "../../clients/argocd/index.js";

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
      next_actions: {
        create_new_project: "Use createArgoProject tool to add a new project",
        view_applications: "Click 'applications' links to see project applications",
        manage_settings: "Click 'settings' links to configure project settings",
        learn_more: "Visit the ArgoCD documentation for project management guides",
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
            error: `Failed to read ArgoCD projects: ${error.message}`,
            troubleshooting: {
              check_argocd_token: "Ensure ARGOCD_TOKEN environment variable is set",
              check_permissions: "Verify your ArgoCD token has 'projects' list permissions",
              argocd_docs: "https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource definition for ArgoCD projects
export const argoCDProjectsResource: ResourceDefinition = {
  uri: "argocd://projects",
  name: "argoCDProjects",
  metadata: {
    name: "ArgoCD Projects",
    description: "List of all ArgoCD projects with management links and configuration details",
  },
  requiredPermissions: ["argocd:read", "argocd:projects:list", "admin"],
  readCallback,
};
