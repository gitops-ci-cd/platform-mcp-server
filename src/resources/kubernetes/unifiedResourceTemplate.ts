import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { listResources, listNamespaces, listAvailableResourcesInNamespace, listAvailableClusterResources } from "../../../lib/clients/kubernetes/index.js";

// Read callback function for unified kubernetes resources template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  let { plural, namespace } = variables as {
    plural: string;
    namespace: string;
  };

  // This is a workaround for the "none" namespace, which should be treated as an empty string
  // This is necessary because the MCP client does not handle empty parameters correctly
  // https://github.com/modelcontextprotocol/typescript-sdk/issues/677
  if (namespace === "none") {
    namespace = "";
  }

  try {
    const data = await listResources({ plural, namespace });

    return resourceResponse({
      message: `Successfully retrieved ${plural} resources from namespace '${namespace}'`,
      data,
      metadata: {
        plural,
        namespace,
      },
      links: {
        apiDocs: "https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/",
        cliDocs: "https://kubernetes.io/docs/reference/kubectl/kubectl/",
        customResources: "https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/",
      }
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Kubernetes resources: ${error.message}`,
      metadata: {
        plural,
        namespace,
      },
      links: {
        apiDocs: "https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/",
        cliDocs: "https://kubernetes.io/docs/reference/kubectl/kubectl/",
      }
    }, uri);
  }
};

// Resource template definition for unified kubernetes resources
export const kubernetesUnifiedResourceTemplate: ResourceTemplateDefinition = {
  title: "Kubernetes Resources",
  resourceTemplate: new ResourceTemplate(
    "kubernetes://resources/{namespace}/{plural}",
    // "kubernetes://resources/{resourceType}{/namespace?}", // empty namespace is not working https://github.com/modelcontextprotocol/typescript-sdk/issues/677
    {
      list: undefined,
      complete: {
        namespace: async (value?: string): Promise<string[]> => {
          try {
            const response = await listNamespaces(value);
            return ["none", ...response.sort()];
          } catch {
            return ["none", "default", "kube-system"];
          }
        },
        plural: async (value: string, context?: { arguments?: Record<string, string>; }): Promise<string[]> => {
          let namespace = context?.arguments?.namespace;
          if (namespace === "none") {
            namespace = "";
          }

          if (namespace) {
            // If namespace is provided, only show resource types that have instances in that namespace
            const response = await listAvailableResourcesInNamespace(namespace, value);
            return response.sort();
          } else {
            const response = await listAvailableClusterResources(value);
            return response.sort();
          }
        },
      },
    }
  ),
  metadata: {
    description: "List Kubernetes native and custom resources by type and optional namespace. Supports both native resources (pods, services, etc.) and custom resources (plural format). Omit namespace for cluster-scoped resources",
  },
  requiredPermissions: ["kubernetes:read", "kubernetes:list", "admin"],
  readCallback,
};
