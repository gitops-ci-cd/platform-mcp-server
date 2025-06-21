import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getArgoCDConfig,
  argoCDApiRequest,
  createArgoCDMetadata,
  createDefaultSyncPolicy
} from "../../../clients/argocd/index.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const {
      name,
      project,
      namespace,
      repoURL,
      path,
      targetRevision,
      destinationServer,
      destinationNamespace,
      syncPolicy,
      parameters,
      helm
    } = args as {
      name: string;
      project: string;
      namespace?: string;
      repoURL: string;
      path?: string;
      targetRevision?: string;
      destinationServer?: string;
      destinationNamespace: string;
      syncPolicy?: Record<string, any>;
      parameters?: Array<{ name: string; value: string }>;
      helm?: Record<string, any>;
    };

    // Get authenticated user for audit logging
    const user = getCurrentUser(`creating ArgoCD application: ${name}`);

    // Load ArgoCD configuration
    const argoCDConfig = getArgoCDConfig();

    // Prepare application configuration
    const appConfig: any = {
      metadata: createArgoCDMetadata(name, namespace || "argocd", user.email),
      spec: {
        project: project || "default",
        source: {
          repoURL,
          targetRevision: targetRevision || "HEAD",
        },
        destination: {
          server: destinationServer || "https://kubernetes.default.svc",
          namespace: destinationNamespace,
        },
      },
    };

    // Add source path if provided
    if (path) {
      appConfig.spec.source.path = path;
    }

    // Add Helm-specific configuration
    if (helm) {
      appConfig.spec.source.helm = helm;
    }

    // Add parameters for parameterized applications
    if (parameters && parameters.length > 0) {
      if (!appConfig.spec.source.helm) {
        appConfig.spec.source.helm = {};
      }
      appConfig.spec.source.helm.parameters = parameters;
    }

    // Add sync policy
    if (syncPolicy) {
      appConfig.spec.syncPolicy = syncPolicy;
    } else {
      // Default sync policy
      appConfig.spec.syncPolicy = createDefaultSyncPolicy();
    }

    // Create the application
    const result = await argoCDApiRequest(
      "POST",
      "applications",
      argoCDConfig,
      appConfig
    );

    const successData = {
      success: true,
      application: {
        name,
        project: project || "default",
        namespace: namespace || "argocd",
        repoURL,
        path: path || "",
        targetRevision: targetRevision || "HEAD",
        destinationNamespace,
        status: result.status || "Unknown",
        url: `${argoCDConfig.endpoint}/applications/${name}`,
        metadata: result.metadata,
        spec: result.spec,
      },
      argocd_endpoint: argoCDConfig.endpoint,
      created_by: user.email,
      created_at: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(successData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: successData,
    };

  } catch (error: any) {
    const errorData = {
      error: `Failed to create ArgoCD application: ${error.message}`,
      status: "error",
      details: error.stack || error.toString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(errorData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: errorData,
      isError: true
    };
  }
};

export const createArgoCDApplicationTool: ToolDefinition = {
  name: "createArgoCDApplication",
  description: "Create a new application in ArgoCD via direct API call. Supports GitOps deployments with Helm charts, Kustomize, and plain YAML.",
  inputSchema: z.object({
    name: z.string().describe("Application name (must be unique within the namespace)"),
    project: z.string().default("default").describe("ArgoCD project (defaults to 'default')"),
    namespace: z.string().optional().default("argocd").describe("Namespace where the application will be created"),
    repoURL: z.string().describe("Git repository URL containing the application manifests"),
    path: z.string().optional().describe("Path within the repository (required for directories, optional for Helm charts)"),
    targetRevision: z.string().optional().default("HEAD").describe("Git revision to deploy (branch, tag, or commit SHA)"),
    destinationServer: z.string().optional().default("https://kubernetes.default.svc").describe("Target Kubernetes cluster server"),
    destinationNamespace: z.string().describe("Target namespace for application deployment"),
    syncPolicy: z.object({
      automated: z.object({
        prune: z.boolean().optional(),
        selfHeal: z.boolean().optional(),
      }).optional(),
      syncOptions: z.array(z.string()).optional(),
    }).optional().describe("Sync policy configuration"),
    parameters: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })).optional().describe("Helm parameters or Kustomize settings"),
    helm: z.object({
      releaseName: z.string().optional(),
      values: z.string().optional(),
      valueFiles: z.array(z.string()).optional(),
      parameters: z.array(z.object({
        name: z.string(),
        value: z.string(),
      })).optional(),
    }).optional().describe("Helm-specific configuration"),
  }),
  requiredPermissions: ["argocd:admin", "argocd:applications:create", "admin"],
  callback
};
