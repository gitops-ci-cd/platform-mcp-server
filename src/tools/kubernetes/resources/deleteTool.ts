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
        links: {
          docs: "https://kubernetes.io/docs/reference/kubectl/kubectl-delete/"
        },
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
      links: {
        docs: "https://kubernetes.io/docs/reference/kubectl/kubectl-delete/"
      },
      metadata: {
        gracePeriodSeconds: gracePeriodSeconds || undefined
      }
    });
  } catch (error) {
    const k8sError = error as KubernetesError;

    return toolResponse({
      message: k8sError.message,
      data: { kind, name, namespace },
      links: {
        docs: "https://kubernetes.io/docs/reference/kubectl/",
        troubleshooting: "https://kubernetes.io/docs/troubleshooting/"
      },
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
  requiredPermissions: ["k8s:admin", "k8s:delete", "admin"],
  callback
};
