import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { deleteResource, getResource, KubernetesError, SUPPORTED_RESOURCE_KINDS } from "../../../clients/kubernetes/index.js";

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
      const dryRunData = {
        dryRun: true,
        resource: {
          kind: resource.kind,
          name: resource.metadata.name,
          namespace: resource.metadata.namespace,
          apiVersion: resource.apiVersion,
          creationTimestamp: resource.metadata.creationTimestamp
        }
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(dryRunData, null, 2),
            mimeType: "application/json"
          }
        ],
        structuredContent: dryRunData
      };
    }

    // Perform the actual deletion
    await deleteResource(kind, name, namespace, undefined, gracePeriodSeconds);

    const successData = {
      action: "deleted" as const,
      resource: {
        kind: resource.kind,
        name: resource.metadata.name,
        namespace: resource.metadata.namespace,
        apiVersion: resource.apiVersion
      },
      gracePeriodSeconds: gracePeriodSeconds || undefined
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(successData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: successData
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

    const errorData = {
      error: errorMessage,
      statusCode: k8sError.statusCode,
      resource: {
        kind,
        name,
        namespace
      }
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
  }),
  callback
};
