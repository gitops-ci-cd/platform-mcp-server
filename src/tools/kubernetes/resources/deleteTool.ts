import { z } from "zod";
import { ToolDefinition, toolResponse } from "../../registry.js";
import { deleteResource, getResource, KubernetesError, SUPPORTED_RESOURCE_KINDS } from "../../../clients/kubernetes/index.js";

const inputSchema = z.object({
  kind: z.enum(SUPPORTED_RESOURCE_KINDS).describe("Kubernetes resource kind (e.g. Pod, Service, Deployment)"),
  name: z.string().describe("Name of the resource"),
  namespace: z.string().optional().describe("Namespace (optional for cluster-scoped resources)"),
  gracePeriodSeconds: z.number().optional().describe("Grace period for graceful deletion (seconds)"),
  dryRun: z.boolean().default(false).describe("Perform a dry run without actually deleting the resource")
});

const outputSchema = z.object({
  action: z.enum(["deleted", "dry-run"]).optional().describe("Action performed"),
  resource: z.object({
    kind: z.string().describe("Resource kind"),
    name: z.string().describe("Resource name"),
    namespace: z.string().optional().describe("Resource namespace"),
    uid: z.string().optional().describe("Resource UID"),
    deletionTimestamp: z.string().optional().describe("When deletion was initiated")
  }).optional().describe("Information about the deleted resource"),
  message: z.string().optional().describe("Success message or dry-run information"),
  dryRun: z.boolean().optional().describe("Whether this was a dry run"),
  gracePeriodSeconds: z.number().optional().describe("Grace period used for deletion"),
  error: z.string().optional().describe("Error message (only present on failure)"),
  statusCode: z.number().optional().describe("HTTP status code for the error (only present on failure)")
});

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
    const data = await getResource(kind, name, namespace);

    if (dryRun) {
      return toolResponse({
        message: `Dry run: Would delete ${kind}/${name}${namespace ? ` in namespace ${namespace}` : ""}`,
        data,
        metadata: {
          operation: "delete"
        }
      });
    }

    // Perform the actual deletion
    await deleteResource(kind, name, namespace, undefined, gracePeriodSeconds);

    return toolResponse({
      message: `Successfully deleted ${kind}/${name}${namespace ? ` from namespace ${namespace}` : ""}`,
      data,
      metadata: {
        gracePeriodSeconds: gracePeriodSeconds || undefined
      }
    });
  } catch (error) {
    const k8sError = error as KubernetesError;

    return toolResponse({
      message: k8sError.message,
      data: { kind, name, namespace },
      metadata: {
        statusCode: k8sError.statusCode,
        troubleshooting: [
          "Check if the resource exists",
          "Verify you have the necessary permissions",
          "Ensure the namespace is correct"
        ]
      }
    }, true);
  }
};

export const deleteKubernetesResourceTool: ToolDefinition = {
  title: "Delete Kubernetes Resource",
  description: "Delete a Kubernetes resource by kind and name. Supports dry-run mode and graceful deletion.",
  inputSchema,
  outputSchema,
  callback
};
