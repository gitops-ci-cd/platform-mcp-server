import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getArgoCDConfig, readApplication, listApplications as getApplications } from "../../../lib/clients/argocd/index.js";

// Read callback function for ArgoCD application resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables, _extra) => {
  const { applicationName } = variables as { applicationName: string };

  try {
    // Load ArgoCD configuration for URL building
    const argoCDConfig = getArgoCDConfig();

    // Get specific application using convenience method (returns raw response)
    const response = await readApplication(applicationName);
    const data = await response.json();

    const argoCDWebUrl = argoCDConfig.endpoint;
    const appWebUrl = `${argoCDWebUrl}/applications/${applicationName}`;

    return resourceResponse({
      message: `Retrieved ArgoCD Application: ${data?.metadata?.name || applicationName}`,
      data,
      links: {
        ui: appWebUrl,
        api: `${argoCDWebUrl}/api/v1/applications/${applicationName}`,
        docs: "https://argo-cd.readthedocs.io/en/stable/"
      },
      metadata: {
        name: data.metadata?.name || applicationName,
        potentialActions: [
          "Use syncArgoCDApplication tool to sync this application",
          "Click 'ui' link to view in ArgoCD Web UI",
          "Check sync_status and health_status for application state",
          "Review resources array for deployed Kubernetes resources"
        ]
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read ArgoCD application: ${error.message}`,
      links: {
        docs: "https://argo-cd.readthedocs.io/en/stable/",
        troubleshooting: "https://argo-cd.readthedocs.io/en/stable/faq/"
      },
      metadata: {
        troubleshooting: [
          "Verify the application name exists in ArgoCD",
          "Ensure ARGOCD_TOKEN environment variable is set",
          "Verify your ArgoCD token has 'applications' read permissions",
          "Check ArgoCD API connectivity and service status"
        ]
      }
    }, uri);
  }
};

// Resource template definition for ArgoCD applications
export const argoCDApplicationTemplate: ResourceTemplateDefinition = {
  title: "ArgoCD Applications",
  resourceTemplate: new ResourceTemplate(
    "argocd://applications/{applicationName}",
    {
      list: undefined,
      complete: {
        applicationName: async (value: string): Promise<string[]> => {
          const response = await getApplications(value);

          return response;
        }
      }
    }
  ),
  metadata: {
    description: "Access specific ArgoCD applications by name. Provides application details, sync status, and management actions",
  },
  requiredPermissions: ["argocd:read", "argocd:applications:read", "admin"],
  readCallback,
};
