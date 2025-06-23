import { ResourceDefinition, resourceResponse } from "../registry.js";
import { getArgoCDConfig, argoCDApiRequest } from "../../clients/argocd/index.js";

// Read callback function for ArgoCD applications resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Load ArgoCD configuration
    const argoCDConfig = getArgoCDConfig();

    // List all applications
    const applicationsResponse = await argoCDApiRequest(
      "GET",
      "applications",
      argoCDConfig
    );

    if (!applicationsResponse?.items) {
      throw new Error("No applications data returned from ArgoCD");
    }

    const argoCDWebUrl = argoCDConfig.endpoint;

    // Transform applications data with action-oriented information
    const applications = applicationsResponse.items.map((app: any) => {
      const appName = app.metadata?.name || "unknown";
      const appWebUrl = `${argoCDWebUrl}/applications/${appName}`;
      const syncStatus = app.status?.sync?.status || "Unknown";
      const healthStatus = app.status?.health?.status || "Unknown";

      return {
        name: appName,
        namespace: app.metadata?.namespace || "argocd",
        project: app.spec?.project || "default",
        sync_status: syncStatus,
        health_status: healthStatus,
        source: {
          repo_url: app.spec?.source?.repoURL || "",
          path: app.spec?.source?.path || "",
          target_revision: app.spec?.source?.targetRevision || "HEAD",
        },
        destination: {
          server: app.spec?.destination?.server || "",
          namespace: app.spec?.destination?.namespace || "",
        },
        actions: {
          view: appWebUrl,
          sync: `${appWebUrl}?action=sync`,
          refresh: `${appWebUrl}?action=refresh`,
          logs: `${appWebUrl}/logs`,
          events: `${appWebUrl}/events`,
          manifest: `${appWebUrl}/manifest`,
        },
        management_info: {
          web_ui: appWebUrl,
          api_path: `${argoCDConfig.endpoint}/api/v1/applications/${appName}`,
        }
      };
    });

    const resourceData = {
      applications,
      summary: {
        total_count: applications.length,
        by_sync_status: applications.reduce((acc: any, app: any) => {
          acc[app.sync_status] = (acc[app.sync_status] || 0) + 1;
          return acc;
        }, {}),
        by_health_status: applications.reduce((acc: any, app: any) => {
          acc[app.health_status] = (acc[app.health_status] || 0) + 1;
          return acc;
        }, {}),
        by_project: applications.reduce((acc: any, app: any) => {
          acc[app.project] = (acc[app.project] || 0) + 1;
          return acc;
        }, {}),
      },
      argocd_info: {
        endpoint: argoCDConfig.endpoint,
        web_ui: argoCDWebUrl,
        docs: "https://argo-cd.readthedocs.io/en/stable/",
      },
    };

    return resourceResponse({
      message: "Successfully retrieved ArgoCD applications",
      data: resourceData,
      metadata: {
        totalCount: applications.length,
        bySyncStatus: resourceData.summary.by_sync_status,
        byHealthStatus: resourceData.summary.by_health_status,
        byProject: resourceData.summary.by_project,
      },
      links: {
        "ArgoCD Web UI": argoCDWebUrl,
        "ArgoCD Documentation": "https://argo-cd.readthedocs.io/en/stable/",
        "ArgoCD API Documentation": "https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/",
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read ArgoCD applications: ${error.message}`,
      metadata: {
        troubleshooting: [
          "Ensure ARGOCD_TOKEN environment variable is set",
          "Verify your ArgoCD token has 'applications' list permissions",
        ],
      },
      links: {
        "ArgoCD API Documentation": "https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/",
      }
    }, uri);
  }
};

// Resource definition for ArgoCD applications
export const argoCDApplicationsResource: ResourceDefinition = {
  uri: "argocd://applications",
  title: "ArgoCD Applications",
  metadata: {
    description: "List of all ArgoCD applications with management links and sync status",
  },
  requiredPermissions: ["argocd:read", "argocd:applications:list", "admin"],
  readCallback,
};
