import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const {
    projectName,
    description = "",
    sourceRepos,
    destinations,
    clusterResourceWhitelist = [],
    namespaceResourceWhitelist = [],
    roles = [],
    syncWindows = []
  } = args as {
    projectName: string;
    description?: string;
    sourceRepos: string[];
    destinations: Array<{
      server: string;
      namespace?: string;
      name?: string;
    }>;
    clusterResourceWhitelist?: Array<{
      group: string;
      kind: string;
    }>;
    namespaceResourceWhitelist?: Array<{
      group: string;
      kind: string;
    }>;
    roles?: Array<{
      name: string;
      description?: string;
      policies: string[];
      groups?: string[];
    }>;
    syncWindows?: Array<{
      kind: string;
      schedule: string;
      duration: string;
      applications?: string[];
      manualSync?: boolean;
    }>;
  };

  // Generate ArgoCD Project YAML manifest
  const yamlManifest = `apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: ${projectName}
  namespace: argocd
  labels:
    platform.mcp/managed: "true"
    platform.mcp/tool: "generateArgoProjectManifest"
spec:
  description: "${description}"
  sourceRepos:${sourceRepos.map(repo => `\n  - "${repo}"`).join("")}
  destinations:${destinations.map(dest => `\n  - server: "${dest.server}"${dest.namespace ? `\n    namespace: "${dest.namespace}"` : ""}${dest.name ? `\n    name: "${dest.name}"` : ""}`).join("")}${clusterResourceWhitelist.length > 0 ? `\n  clusterResourceWhitelist:${clusterResourceWhitelist.map(res => `\n  - group: "${res.group}"\n    kind: "${res.kind}"`).join("")}` : ""}${namespaceResourceWhitelist.length > 0 ? `\n  namespaceResourceWhitelist:${namespaceResourceWhitelist.map(res => `\n  - group: "${res.group}"\n    kind: "${res.kind}"`).join("")}` : ""}${roles.length > 0 ? `\n  roles:${roles.map(role => `\n  - name: "${role.name}"${role.description ? `\n    description: "${role.description}"` : ""}\n    policies:${role.policies.map(policy => `\n    - "${policy}"`).join("")}${role.groups ? `\n    groups:${role.groups.map(group => `\n    - "${group}"`).join("")}` : ""}`).join("")}` : ""}${syncWindows.length > 0 ? `\n  syncWindows:${syncWindows.map(window => `\n  - kind: "${window.kind}"\n    schedule: "${window.schedule}"\n    duration: "${window.duration}"${window.applications ? `\n    applications:${window.applications.map(app => `\n    - "${app}"`).join("")}` : ""}${window.manualSync !== undefined ? `\n    manualSync: ${window.manualSync}` : ""}`).join("")}` : ""}`;

  return {
    content: [
      {
        type: "text" as const,
        text: yamlManifest,
        mimeType: "application/x-yaml"
      }
    ],
    structuredContent: {
      message: `Generated ArgoCD Project manifest for ${projectName}`,
      data: {
        projectName,
        manifestSize: yamlManifest.length,
        sourceReposCount: sourceRepos.length,
        destinationsCount: destinations.length,
        rolesCount: roles.length
      }
    }
  };
};

export const generateArgoProjectManifestTool: ToolDefinition = {
  name: "generateArgoProjectManifest",
  description: "Generate ArgoCD Project YAML manifest for GitOps project configuration",
  inputSchema: z.object({
    projectName: z.string().describe("Name of the ArgoCD project"),
    description: z.string().optional().describe("Description of the project"),
    sourceRepos: z.array(z.string()).describe("List of allowed source repositories (URLs or wildcards)"),
    destinations: z.array(z.object({
      server: z.string().describe("Kubernetes cluster server URL or name"),
      namespace: z.string().optional().describe("Allowed namespace (if not specified, all namespaces allowed)"),
      name: z.string().optional().describe("Friendly name for the destination")
    })).describe("List of allowed deployment destinations"),
    clusterResourceWhitelist: z.array(z.object({
      group: z.string().describe("Kubernetes API group"),
      kind: z.string().describe("Kubernetes resource kind")
    })).optional().describe("Cluster-scoped resources that applications in this project can manage"),
    namespaceResourceWhitelist: z.array(z.object({
      group: z.string().describe("Kubernetes API group"),
      kind: z.string().describe("Kubernetes resource kind")
    })).optional().describe("Namespace-scoped resources that applications in this project can manage"),
    roles: z.array(z.object({
      name: z.string().describe("Role name"),
      description: z.string().optional().describe("Role description"),
      policies: z.array(z.string()).describe("RBAC policies for this role"),
      groups: z.array(z.string()).optional().describe("Groups assigned to this role")
    })).optional().describe("RBAC roles for the project"),
    syncWindows: z.array(z.object({
      kind: z.string().describe("Sync window kind (allow/deny)"),
      schedule: z.string().describe("Cron schedule for the sync window"),
      duration: z.string().describe("Duration of the sync window"),
      applications: z.array(z.string()).optional().describe("Applications affected by this sync window"),
      manualSync: z.boolean().optional().describe("Allow manual sync during deny windows")
    })).optional().describe("Sync windows for controlling when applications can sync")
  }),
  callback
};
