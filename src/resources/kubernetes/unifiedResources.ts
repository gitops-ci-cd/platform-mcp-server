import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { listResources, listNamespaces, listAvailableResources } from "../../../lib/clients/kubernetes/index.js";
import { resourceCache, checkCache } from "../../../lib/cache.js";

// Read callback function for unified kubernetes resources template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { resourceType, namespace } = variables as {
    resourceType: string;
    namespace: string;
  };

  // Extract group, version, kind, and plural from the resourceType
  let [group, version, kind, plural] = resourceType.split("--");
  if (group === "core") {
    group = ""; // Core resources do not have a group
  }

  try {
    const data = await listResources(version, group, plural, kind, namespace);

    return resourceResponse({
      message: `Successfully retrieved ${plural || kind} resources from group '${group}', version '${version}'${namespace ? ` in namespace '${namespace}'` : ""}`,
      data,
      metadata: {
        group,
        version,
        kind,
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
        group,
        version,
        kind,
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
export const kubernetesUnifiedResourcesTemplate: ResourceTemplateDefinition = {
  title: "Kubernetes Resources",
  resourceTemplate: new ResourceTemplate(
    "kubernetes://resources/{resourceType}/{namespace}",
    {
      list: undefined,
      complete: {
        resourceType: async (value: string): Promise<string[]> => {
          // Moving cache out of client to allow for caching the built up name (with --)
          // TODO: This could probably be improved once we have less items in the name
          const cacheKey = "k8s-available-resources";
          const cache = checkCache(cacheKey, value);
          if (cache.length > 0) return cache;

          const response = await listAvailableResources();

          // Convert resource kinds to the format used in the URI
          const list = response.map(resource => {
            let { group, version, kind, name } = resource;
            if (!version) {
              [group, version] = ["core", group];
            }
            return `${group}--${version}--${kind}--${name}`;
          });

          return resourceCache.set(cacheKey, list, 30 * 60 * 1000);
        },
        namespace: async (value: string, _context?: { arguments?: Record<string, string>; }): Promise<string[]> => {
          // TODO: When context is available, we could check if the selected resource type
          // is cluster-scoped and return an empty array to skip namespace selection

          // console.log(context);

          try {
            const response = await listNamespaces(value);

            return response.sort();
          } catch {
            return ["default", "kube-system"];
          }
        }
      }
    }
  ),
  metadata: {
    description: "List Kubernetes native and custom resources by type and optional namespace. Supports both native resources (pods, services, etc.) and custom resources (plural format). Omit namespace for cluster-scoped resources",
  },
  requiredPermissions: ["kubernetes:read", "kubernetes:list", "admin"],
  readCallback,
};
