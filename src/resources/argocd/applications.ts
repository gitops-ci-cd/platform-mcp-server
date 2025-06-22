import { ResourceDefinition } from "../registry.js";
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
      next_actions: {
        create_new_application: "Use createArgoCDApplication tool to deploy a new application",
        sync_out_of_sync: "Click 'sync' links for applications with OutOfSync status",
        check_unhealthy: "Click 'view' links for applications with Degraded or Missing health status",
        learn_more: "Visit the ArgoCD documentation for application management guides",
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
            error: `Failed to read ArgoCD applications: ${error.message}`,
            troubleshooting: {
              check_argocd_token: "Ensure ARGOCD_TOKEN environment variable is set",
              check_permissions: "Verify your ArgoCD token has 'applications' list permissions",
              argocd_docs: "https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource definition for ArgoCD applications
export const argoCDApplicationsResource: ResourceDefinition = {
  uri: "argocd://applications",
  name: "argoCDApplications",
  metadata: {
    name: "ArgoCD Applications",
    description: "List of all ArgoCD applications with management links and sync status",
  },
  requiredPermissions: ["argocd:read", "argocd:applications:list", "admin"],
  readCallback,
};
