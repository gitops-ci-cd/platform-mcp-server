import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { listResources, KubernetesError, SUPPORTED_RESOURCE_KINDS } from "../utils.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { kind, namespace, labelSelector, fieldSelector, limit } = args as {
    kind: typeof SUPPORTED_RESOURCE_KINDS[number];
    namespace?: string;
    labelSelector?: string;
    fieldSelector?: string;
    limit?: number;
  };

  try {
    const resources = await listResources(kind, namespace, undefined, labelSelector, fieldSelector, limit);

    const summary = resources.map(r => ({
      kind: kind, // Use the kind parameter since it's not always on the resource object
      name: r.metadata?.name || "",
      namespace: r.metadata?.namespace,
      apiVersion: r.apiVersion,
      created: r.metadata?.creationTimestamp ? new Date(r.metadata.creationTimestamp).toISOString() : undefined,
      labels: r.metadata?.labels || {},
      status: r.status
    }));

    // Create structured data object for both text and structured content
    const structuredData = {
      count: resources.length,
      resources: resources,
      summary: summary
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(structuredData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: structuredData,
    };
  } catch (error) {
    const k8sError = error as KubernetesError;
    const errorMessage = `Failed to list ${kind}: ${k8sError.message}`;

    const errorData = {
      error: errorMessage,
      statusCode: k8sError.statusCode
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

export const getKubernetesResourcesTool: ToolDefinition = {
  name: "getKubernetesResources",
  description: "List Kubernetes resources with optional filtering. Use describeKubernetesResource for detailed analysis of a single resource. Returns structured JSON data optimized for AI consumption.",
  inputSchema: z.object({
    kind: z.enum(SUPPORTED_RESOURCE_KINDS).describe("Kubernetes resource kind (e.g. Pod, Service, Deployment)"),
    namespace: z.string().optional().describe("Namespace (optional for cluster-scoped resources)"),
    labelSelector: z.string().optional().describe("Label selector to filter resources (e.g. 'app=nginx,env=prod')"),
    fieldSelector: z.string().optional().describe("Field selector to filter resources (e.g. 'status.phase=Running')"),
    limit: z.number().optional().describe("Maximum number of resources to return")
  }),
  outputSchema: z.object({
    count: z.number().optional().describe("Number of resources found"),
    resources: z.array(z.any()).optional().describe("Array of Kubernetes resources"),
    summary: z.array(z.object({
      kind: z.string().describe("Resource kind"),
      name: z.string().describe("Resource name"),
      namespace: z.string().optional().describe("Resource namespace"),
      apiVersion: z.string().optional().describe("API version"),
      created: z.string().optional().describe("Creation timestamp"),
      labels: z.record(z.string()).optional().describe("Resource labels"),
      status: z.any().optional().describe("Resource status")
    })).optional().describe("Summary information about the resources"),
    error: z.string().optional().describe("Error message (only present on failure)"),
    statusCode: z.number().optional().describe("HTTP status code for the error (only present on failure)")
  }),
  callback
};
