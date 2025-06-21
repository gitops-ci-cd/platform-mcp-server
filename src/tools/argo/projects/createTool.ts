import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getArgoCDConfig,
  argoCDApiRequest,
  createArgoCDMetadata,
  type ArgoCDResourceRestriction,
  type ArgoCDProjectRole
} from "../../../clients/argocd/index.js";

const inputSchema = z.object({
  name: z.string().describe("Project name (must be unique and DNS-compliant)"),
  description: z.string().optional().describe("Human-readable description of the project"),
  sourceRepos: z.array(z.string()).describe("List of Git repositories this project can access (* for all)"),
  destinations: z.array(z.object({
    server: z.string().describe("Kubernetes cluster server URL"),
    namespace: z.string().optional().describe("Target namespace (* for all namespaces)"),
    name: z.string().optional().describe("Cluster name (optional)"),
  })).describe("List of allowed deployment destinations"),
  clusterResourceWhitelist: z.array(z.object({
    group: z.string().describe("Kubernetes API group"),
    kind: z.string().describe("Resource kind"),
  })).optional().describe("Cluster-scoped resources this project can manage"),
  clusterResourceBlacklist: z.array(z.object({
    group: z.string().describe("Kubernetes API group"),
    kind: z.string().describe("Resource kind"),
  })).optional().describe("Cluster-scoped resources this project cannot manage"),
  namespaceResourceWhitelist: z.array(z.object({
    group: z.string().describe("Kubernetes API group"),
    kind: z.string().describe("Resource kind"),
  })).optional().describe("Namespace-scoped resources this project can manage"),
  namespaceResourceBlacklist: z.array(z.object({
    group: z.string().describe("Kubernetes API group"),
    kind: z.string().describe("Resource kind"),
  })).optional().describe("Namespace-scoped resources this project cannot manage"),
  roles: z.array(z.object({
    name: z.string().describe("Role name"),
    description: z.string().optional().describe("Role description"),
    policies: z.array(z.string()).describe("RBAC policies for this role"),
    groups: z.array(z.string()).optional().describe("Groups assigned to this role"),
  })).optional().describe("Project-specific roles and permissions"),
  orphanedResources: z.object({
    warn: z.boolean().optional().describe("Warn about orphaned resources"),
    ignore: z.array(z.object({
      group: z.string().describe("Kubernetes API group"),
      kind: z.string().describe("Resource kind"),
      name: z.string().optional().describe("Resource name pattern"),
    })).optional().describe("Resources to ignore when detecting orphans"),
  }).optional().describe("Orphaned resources detection policy"),
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const {
      name,
      description,
      sourceRepos,
      destinations,
      clusterResourceWhitelist,
      clusterResourceBlacklist,
      namespaceResourceWhitelist,
      namespaceResourceBlacklist,
      roles,
      orphanedResources
    } = args as {
      name: string;
      description?: string;
      sourceRepos: string[];
      destinations: Array<{
        server: string;
        namespace?: string;
        name?: string;
      }>;
      clusterResourceWhitelist?: ArgoCDResourceRestriction[];
      clusterResourceBlacklist?: ArgoCDResourceRestriction[];
      namespaceResourceWhitelist?: ArgoCDResourceRestriction[];
      namespaceResourceBlacklist?: ArgoCDResourceRestriction[];
      roles?: ArgoCDProjectRole[];
      orphanedResources?: {
        warn?: boolean;
        ignore?: Array<{
          group: string;
          kind: string;
          name?: string;
        }>;
      };
    };

    // Get authenticated user for audit logging
    const user = getCurrentUser(`creating ArgoCD project: ${name}`);

    // Load ArgoCD configuration
    const argoCDConfig = getArgoCDConfig();

    // Prepare project configuration
    const projectConfig: any = {
      metadata: createArgoCDMetadata(name, "argocd", user.email),
      spec: {
        description: description || `ArgoCD project ${name}`,
        sourceRepos,
        destinations,
      },
    };

    // Add resource whitelists and blacklists
    if (clusterResourceWhitelist) {
      projectConfig.spec.clusterResourceWhitelist = clusterResourceWhitelist;
    }

    if (clusterResourceBlacklist) {
      projectConfig.spec.clusterResourceBlacklist = clusterResourceBlacklist;
    }

    if (namespaceResourceWhitelist) {
      projectConfig.spec.namespaceResourceWhitelist = namespaceResourceWhitelist;
    }

    if (namespaceResourceBlacklist) {
      projectConfig.spec.namespaceResourceBlacklist = namespaceResourceBlacklist;
    }

    // Add roles if provided
    if (roles && roles.length > 0) {
      projectConfig.spec.roles = roles;
    }

    // Add orphaned resources policy
    if (orphanedResources) {
      projectConfig.spec.orphanedResources = orphanedResources;
    }

    // Create the project
    const result = await argoCDApiRequest(
      "POST",
      "projects",
      argoCDConfig,
      projectConfig
    );

    const successData = {
      success: true,
      project: {
        name,
        description: description || `ArgoCD project ${name}`,
        sourceRepos,
        destinations,
        status: result.status || "Active",
        url: `${argoCDConfig.endpoint}/settings/projects/${name}`,
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
      error: `Failed to create ArgoCD project: ${error.message}`,
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

export const createArgoCDProjectTool: ToolDefinition = {
  name: "createArgoCDProject",
  description: "Create a new project in ArgoCD via direct API call. Projects provide multi-tenancy with RBAC, resource restrictions, and repository access control.",
  inputSchema,
  requiredPermissions: ["argocd:admin", "argocd:projects:create", "admin"],
  callback
};
