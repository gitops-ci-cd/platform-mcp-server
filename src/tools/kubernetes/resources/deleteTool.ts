import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { deleteResource, getResource, KubernetesError, SUPPORTED_RESOURCE_KINDS } from "../utils.js";

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { kind, name, namespace, gracePeriodSeconds, dryRun } = args as {
    kind: typeof SUPPORTED_RESOURCE_KINDS[number];
    name: string;
    namespace?: string;
    gracePeriodSeconds?: number;
    dryRun?: boolean;
  };

  try {
    // First, check if the resource exists
    const resource = await getResource(kind, name, namespace);

    if (dryRun) {
      return {
        content: [
          {
            type: "text" as const,
            text: `DRY RUN: Would delete ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ""}\n\nResource details:\n- API Version: ${resource.apiVersion}\n- Kind: ${resource.kind}\n- Name: ${resource.metadata.name}\n- Namespace: ${resource.metadata.namespace || "cluster-scoped"}\n- Created: ${resource.metadata.creationTimestamp || "Unknown"}`,
            mimeType: "text/plain"
          }
        ],
        structuredContent: {
          success: true,
          dryRun: true,
          resource: {
            kind: resource.kind,
            name: resource.metadata.name,
            namespace: resource.metadata.namespace,
            apiVersion: resource.apiVersion
          }
        }
      };
    }

    // Perform the actual deletion
    await deleteResource(kind, name, namespace, undefined, gracePeriodSeconds);

    const successMessage = `Successfully deleted ${kind}/${name}${namespace ? ` from namespace ${namespace}` : ""}${gracePeriodSeconds ? ` with grace period ${gracePeriodSeconds}s` : ""}`;

    return {
      content: [
        {
          type: "text" as const,
          text: successMessage,
          mimeType: "text/plain"
        }
      ],
      structuredContent: {
        success: true,
        action: "deleted",
        resource: {
          kind: resource.kind,
          name: resource.metadata.name,
          namespace: resource.metadata.namespace,
          apiVersion: resource.apiVersion
        },
        gracePeriodSeconds: gracePeriodSeconds || undefined
      }
    };
  } catch (error) {
    const k8sError = error as KubernetesError;
    let errorMessage: string;

    if (k8sError.statusCode === 404) {
      errorMessage = `Resource ${kind}/${name} not found${namespace ? ` in namespace ${namespace}` : ""}`;
    } else if (k8sError.statusCode === 403) {
      errorMessage = `Permission denied: Cannot delete ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ""}`;
    } else {
      errorMessage = `Failed to delete ${kind}/${name}: ${k8sError.message}`;
    }

    return {
      content: [
        {
          type: "text" as const,
          text: errorMessage,
          mimeType: "text/plain"
        }
      ],
      structuredContent: {
        success: false,
        error: errorMessage,
        statusCode: k8sError.statusCode,
        resource: {
          kind,
          name,
          namespace
        }
      }
    };
  }
};

export const deleteKubernetesResourceTool: ToolDefinition = {
  name: "deleteKubernetesResource",
  description: "Delete a Kubernetes resource by kind and name. Supports dry-run mode and graceful deletion.",
  inputSchema: z.object({
    kind: z.enum(SUPPORTED_RESOURCE_KINDS).describe("Kubernetes resource kind (e.g. Pod, Service, Deployment)"),
    name: z.string().describe("Name of the resource"),
    namespace: z.string().optional().describe("Namespace (optional for cluster-scoped resources)"),
    gracePeriodSeconds: z.number().optional().describe("Grace period for graceful deletion (seconds)"),
    dryRun: z.boolean().default(false).describe("Perform a dry run without actually deleting the resource")
  }),
  outputSchema: z.object({
    success: z.boolean().describe("Whether the operation completed successfully"),
    action: z.enum(["deleted", "dry-run"]).optional().describe("Action performed (only present on success)"),
    resource: z.object({
      kind: z.string().describe("Resource kind"),
      name: z.string().describe("Resource name"),
      namespace: z.string().optional().describe("Resource namespace"),
      uid: z.string().optional().describe("Resource UID"),
      deletionTimestamp: z.string().optional().describe("When deletion was initiated")
    }).optional().describe("Information about the deleted resource (only present on success)"),
    message: z.string().optional().describe("Success message or dry-run information (only present on success)"),
    error: z.string().optional().describe("Error message (only present on failure)"),
    statusCode: z.number().optional().describe("HTTP status code for the error (only present on failure)")
  }),
  callback
};
