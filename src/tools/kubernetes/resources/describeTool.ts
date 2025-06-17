import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getResource, getResourceEvents, KubernetesError, SUPPORTED_RESOURCE_KINDS } from "../utils.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { kind, name, namespace, includeEvents } = args as {
    kind: typeof SUPPORTED_RESOURCE_KINDS[number];
    name: string;
    namespace?: string;
    includeEvents: boolean;
  };

  try {
    // Get the main resource
    const resource = await getResource(kind, name, namespace);

    // Optionally get events
    let events: any[] = [];
    if (includeEvents) {
      try {
        events = await getResourceEvents(kind, name, namespace);
      } catch {
        // If events fail, continue without them
      }
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `${kind}/${resource.metadata.name}${resource.metadata.namespace ? ` in ${resource.metadata.namespace}` : ""} - ${resource.apiVersion}
Created: ${resource.metadata.creationTimestamp ? new Date(resource.metadata.creationTimestamp).toLocaleString() : "Unknown"}
${includeEvents && events.length > 0 ? `Events: ${events.length} found` : ""}`,
          mimeType: "text/plain"
        }
      ],
      structuredContent: {
        success: true,
        resource,
        events: includeEvents ? events : undefined
      }
    };
  } catch (error) {
    const k8sError = error as KubernetesError;
    const errorMessage = k8sError.statusCode === 404
      ? `Resource ${kind}/${name} not found${namespace ? ` in namespace ${namespace}` : ""}`
      : `Failed to describe ${kind}/${name}: ${k8sError.message}`;

    return {
      content: [
        {
          type: "text" as const,
          text: `Failed to describe ${kind}/${name}${namespace ? ` in ${namespace}` : ""}: ${errorMessage}`,
          mimeType: "text/plain"
        }
      ],
      structuredContent: {
        success: false,
        error: errorMessage,
        statusCode: k8sError.statusCode
      }
    };
  }
};

export const describeKubernetesResourceTool: ToolDefinition = {
  name: "describeKubernetesResource",
  description: "Get detailed analysis of a Kubernetes resource including metadata, status, events, and relationships. Returns structured JSON data optimized for AI consumption.",
  inputSchema: z.object({
    kind: z.enum(SUPPORTED_RESOURCE_KINDS).describe("Kubernetes resource kind (e.g. Pod, Service, Deployment)"),
    name: z.string().describe("Name of the resource"),
    namespace: z.string().optional().describe("Namespace (optional for cluster-scoped resources)"),
    includeEvents: z.boolean().default(true).describe("Include related events in the analysis")
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the operation completed successfully"),
    resource: z.any().optional().describe("Raw Kubernetes resource data (only present on success)"),
    events: z.array(z.any()).optional().describe("Related Kubernetes events (only present on success when includeEvents=true)"),
    error: z.string().optional().describe("Error message (only present on failure)"),
    statusCode: z.number().optional().describe("HTTP status code for the error (only present on failure)")
  }),
  callback
};
