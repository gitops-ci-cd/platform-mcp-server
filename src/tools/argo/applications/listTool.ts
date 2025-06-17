import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const {
    projectName,
    syncStatus,
    healthStatus,
    namePattern,
    namespace,
    includeDetails,
    sortBy,
    limit
  } = args as {
    projectName?: string;
    syncStatus?: string;
    healthStatus?: string;
    namePattern?: string;
    namespace?: string;
    includeDetails?: boolean;
    sortBy?: string;
    limit?: number;
  };

  // TODO: Implement actual ArgoCD API call to list applications
  // For now, return mock data to demonstrate the structure
  const mockApplications = [
    {
      metadata: {
        name: "example-web-app",
        namespace: "argocd",
        labels: {
          "app.kubernetes.io/instance": "example-web-app"
        },
        createdAt: "2024-01-01T00:00:00Z"
      },
      spec: {
        project: "default",
        source: {
          repoURL: "https://github.com/example/web-app",
          path: "k8s/overlays/prod",
          targetRevision: "main"
        },
        destination: {
          server: "https://kubernetes.default.svc",
          namespace: "web-app-prod"
        }
      },
      status: {
        sync: {
          status: "Synced",
          revision: "abc123def456"
        },
        health: {
          status: "Healthy"
        },
        operationState: {
          phase: "Succeeded",
          finishedAt: "2024-01-01T12:00:00Z"
        }
      }
    },
    {
      metadata: {
        name: "api-service",
        namespace: "argocd",
        labels: {
          "app.kubernetes.io/instance": "api-service"
        },
        createdAt: "2024-01-01T00:00:00Z"
      },
      spec: {
        project: "backend-services",
        source: {
          repoURL: "https://github.com/example/api-service",
          path: "deploy/kubernetes",
          targetRevision: "v1.2.3"
        },
        destination: {
          server: "https://kubernetes.default.svc",
          namespace: "api-prod"
        }
      },
      status: {
        sync: {
          status: "OutOfSync",
          revision: "def456ghi789"
        },
        health: {
          status: "Progressing"
        },
        operationState: {
          phase: "Running",
          startedAt: "2024-01-01T13:00:00Z"
        }
      }
    }
  ];

  // Apply filters
  let filteredApps = mockApplications.filter(app => {
    if (projectName && app.spec.project !== projectName) return false;
    if (syncStatus && app.status.sync.status !== syncStatus) return false;
    if (healthStatus && app.status.health.status !== healthStatus) return false;
    if (namePattern && !app.metadata.name.includes(namePattern)) return false;
    if (namespace && app.spec.destination.namespace !== namespace) return false;
    return true;
  });

  // Apply sorting
  if (sortBy) {
    filteredApps.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.metadata.name.localeCompare(b.metadata.name);
        case "project":
          return a.spec.project.localeCompare(b.spec.project);
        case "sync-status":
          return a.status.sync.status.localeCompare(b.status.sync.status);
        case "health-status":
          return a.status.health.status.localeCompare(b.status.health.status);
        case "created":
          return new Date(a.metadata.createdAt).getTime() - new Date(b.metadata.createdAt).getTime();
        default:
          return 0;
      }
    });
  }

  // Apply limit
  if (limit && limit > 0) {
    filteredApps = filteredApps.slice(0, limit);
  }

  // Prepare response format with direct links
  const baseArgoUrl = "https://argocd.example.com"; // TODO: Make this configurable

  const summary = {
    totalFound: filteredApps.length,
    byStatus: {
      sync: filteredApps.reduce((acc, app) => {
        acc[app.status.sync.status] = (acc[app.status.sync.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      health: filteredApps.reduce((acc, app) => {
        acc[app.status.health.status] = (acc[app.status.health.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    },
    byProject: filteredApps.reduce((acc, app) => {
      acc[app.spec.project] = (acc[app.spec.project] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const responseData = {
    summary,
    applications: includeDetails ? filteredApps.map(app => ({
      ...app,
      links: {
        argoUI: `${baseArgoUrl}/applications/${app.metadata.name}`,
        sync: `argocd app sync ${app.metadata.name}`,
        diff: `argocd app diff ${app.metadata.name}`,
        logs: `argocd app logs ${app.metadata.name}`
      }
    })) : filteredApps.map(app => ({
      name: app.metadata.name,
      project: app.spec.project,
      namespace: app.spec.destination.namespace,
      syncStatus: app.status.sync.status,
      healthStatus: app.status.health.status,
      source: {
        repo: app.spec.source.repoURL,
        revision: app.spec.source.targetRevision
      },
      links: {
        argoUI: `${baseArgoUrl}/applications/${app.metadata.name}`,
        sync: `argocd app sync ${app.metadata.name}`,
        diff: `argocd app diff ${app.metadata.name}`
      }
    }))
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(responseData, null, 2),
        mimeType: "application/json"
      }
    ],
    structuredContent: {
      message: `Found ${filteredApps.length} ArgoCD applications${projectName ? ` in project ${projectName}` : ""}`,
      data: {
        totalFound: filteredApps.length,
        filtersApplied: {
          projectName: projectName || null,
          syncStatus: syncStatus || null,
          healthStatus: healthStatus || null,
          namePattern: namePattern || null,
          namespace: namespace || null
        },
        summary
      }
    }
  };
};

export const listArgoApplicationsTool: ToolDefinition = {
  name: "listArgoApplications",
  description: "List and query ArgoCD applications with filtering and sorting capabilities",
  inputSchema: z.object({
    projectName: z.string().optional().describe("Filter by ArgoCD project name"),
    syncStatus: z.enum(["Synced", "OutOfSync", "Unknown"]).optional().describe("Filter by sync status"),
    healthStatus: z.enum(["Healthy", "Progressing", "Degraded", "Suspended", "Missing", "Unknown"]).optional().describe("Filter by health status"),
    namePattern: z.string().optional().describe("Filter by application name pattern (substring match)"),
    namespace: z.string().optional().describe("Filter by destination namespace"),
    includeDetails: z.boolean().default(false).describe("Include full application details (spec, status, metadata)"),
    sortBy: z.enum(["name", "project", "sync-status", "health-status", "created"]).optional().describe("Sort results by field"),
    limit: z.number().min(1).max(100).optional().describe("Limit number of results (max 100)")
  }),
  callback
};
