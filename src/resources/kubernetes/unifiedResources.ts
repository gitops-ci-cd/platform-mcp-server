import { ResourceTemplateDefinition } from "../registry.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getKubernetesClient } from "../../clients/kubernetes/index.js";

// Resource scope and API mapping for native resources
const NATIVE_RESOURCE_CONFIG: Record<string, {
  api: string;
  method: string;
  isNamespaced: boolean;
  aliases?: string[];
}> = {
  // Core namespaced resources
  pods: { api: "coreV1Api", method: "listNamespacedPod", isNamespaced: true, aliases: ["pod", "po"] },
  services: { api: "coreV1Api", method: "listNamespacedService", isNamespaced: true, aliases: ["service", "svc"] },
  configmaps: { api: "coreV1Api", method: "listNamespacedConfigMap", isNamespaced: true, aliases: ["configmap", "cm"] },
  secrets: { api: "coreV1Api", method: "listNamespacedSecret", isNamespaced: true, aliases: ["secret"] },

  // Apps namespaced resources
  deployments: { api: "appsV1Api", method: "listNamespacedDeployment", isNamespaced: true, aliases: ["deployment", "deploy"] },
  replicasets: { api: "appsV1Api", method: "listNamespacedReplicaSet", isNamespaced: true, aliases: ["replicaset", "rs"] },
  daemonsets: { api: "appsV1Api", method: "listNamespacedDaemonSet", isNamespaced: true, aliases: ["daemonset", "ds"] },
  statefulsets: { api: "appsV1Api", method: "listNamespacedStatefulSet", isNamespaced: true, aliases: ["statefulset", "sts"] },

  // Networking namespaced resources
  ingresses: { api: "networkingV1Api", method: "listNamespacedIngress", isNamespaced: true, aliases: ["ingress", "ing"] },

  // Cluster-scoped resources
  nodes: { api: "coreV1Api", method: "listNode", isNamespaced: false, aliases: ["node"] },
  namespaces: { api: "coreV1Api", method: "listNamespace", isNamespaced: false, aliases: ["namespace", "ns"] },
  persistentvolumes: { api: "coreV1Api", method: "listPersistentVolume", isNamespaced: false, aliases: ["persistentvolume", "pv"] },
};

// Handle native Kubernetes resources
const handleNativeResource = async (uri: any, resourceType: string, namespace: string | undefined, isClusterScope: boolean) => {
  // Normalize resource type (handle aliases)
  const normalizedType = Object.keys(NATIVE_RESOURCE_CONFIG).find(key => {
    const config = NATIVE_RESOURCE_CONFIG[key];
    return key === resourceType || config.aliases?.includes(resourceType);
  });

  if (!normalizedType) {
    const availableTypes = Object.keys(NATIVE_RESOURCE_CONFIG).filter(key => {
      const config = NATIVE_RESOURCE_CONFIG[key];
      return isClusterScope ? !config.isNamespaced : config.isNamespaced;
    });
    throw new Error(`Unsupported native resource type: ${resourceType}. Available ${isClusterScope ? "cluster-scoped" : "namespaced"} types: ${availableTypes.join(", ")}`);
  }

  const resourceConfig = NATIVE_RESOURCE_CONFIG[normalizedType];

  // Validate scope matches request
  if (isClusterScope && resourceConfig.isNamespaced) {
    throw new Error(`Resource type '${resourceType}' is namespaced and requires a namespace. Use: kubernetes://resources/${resourceType}/{namespace}`);
  }

  if (!isClusterScope && !resourceConfig.isNamespaced) {
    throw new Error(`Resource type '${resourceType}' is cluster-scoped and should not specify a namespace. Use: kubernetes://resources/${resourceType}`);
  }

  // Get Kubernetes client
  const k8sClient = getKubernetesClient();

  // Get the appropriate API client
  const apiClient = (k8sClient as any)[resourceConfig.api];
  if (!apiClient) {
    throw new Error(`API client ${resourceConfig.api} not available in current Kubernetes client setup`);
  }

  // List resources
  let response: any;
  if (resourceConfig.isNamespaced) {
    response = await apiClient[resourceConfig.method]({ namespace });
  } else {
    response = await apiClient[resourceConfig.method]({});
  }

  if (!response?.items) {
    throw new Error(`No ${resourceType} found${namespace ? ` in namespace ${namespace}` : " in cluster"}`);
  }

  // Transform resources data into a concise summary view
  const resources = response.items.map((resource: any) => {
    const resourceName = resource.metadata.name;
    const creationTimestamp = resource.metadata.creationTimestamp;

    // Calculate age
    const ageMs = Date.now() - new Date(creationTimestamp).getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const age = ageDays > 0 ? `${ageDays}d${ageHours}h` : `${ageHours}h`;
    const status = resource.status || {};

    // Extract key labels (limit to most important ones)
    const labels = resource.metadata.labels || {};
    const keyLabels = {
      ...(labels["app"] && { app: labels["app"] }),
      ...(labels["version"] && { version: labels["version"] }),
      ...(labels["kubernetes.io/os"] && { os: labels["kubernetes.io/os"] }),
      ...(labels["node.kubernetes.io/instance-type"] && { instance_type: labels["node.kubernetes.io/instance-type"] }),
    };

    return {
      name: resourceName,
      namespace: namespace,
      type: normalizedType,
      status,
      age,
      created: creationTimestamp,
      key_labels: Object.keys(keyLabels).length > 0 ? keyLabels : undefined,
      actions: {
        describe: isClusterScope
          ? `kubectl describe ${normalizedType} ${resourceName}`
          : `kubectl describe ${normalizedType} ${resourceName} -n ${namespace}`,
        get_yaml: isClusterScope
          ? `kubectl get ${normalizedType} ${resourceName} -o yaml`
          : `kubectl get ${normalizedType} ${resourceName} -n ${namespace} -o yaml`,
        logs: normalizedType === "pods" && !isClusterScope
          ? `kubectl logs ${resourceName} -n ${namespace}`
          : undefined,
      },
    };
  });

  const resourceData = {
    resource_type: normalizedType,
    namespace: namespace,
    scope: resourceConfig.isNamespaced ? "namespaced" : "cluster",
    resources,
    summary: {
      total_count: resources.length,
    },
    kubernetes_info: {
      resource_type: normalizedType,
      docs: `https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#${normalizedType.slice(0, -1)}-v1-core`,
    }
  };

  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: "application/json",
        text: JSON.stringify(resourceData, null, 2)
      }
    ]
  };
};

// Handle custom Kubernetes resources (CRDs)
const handleCustomResource = async (uri: any, resourceType: string, namespace: string | undefined, isClusterScope: boolean) => {
  // Parse group/plural from resourceType (e.g., "datadoghq.com/datadogagents")
  const parts = resourceType.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid custom resource format: ${resourceType}. Use format: {group}/{plural} (e.g., datadoghq.com/datadogagents)`);
  }

  const [group, plural] = parts;

  // Get Kubernetes client
  const k8sClient = getKubernetesClient();

  // Use the custom objects API to list custom resources
  const customObjectsApi = k8sClient.customObjectsApi;

  // Try to get the CRD to determine the correct version
  let version = "v1"; // Default fallback
  try {
    const crdsResponse = await k8sClient.apiextensionsV1Api.listCustomResourceDefinition({});
    const matchingCrd = crdsResponse.items.find((crd: any) =>
      crd.spec.group === group && crd.spec.names.plural === plural
    );
    if (matchingCrd && matchingCrd.spec.versions?.length > 0) {
      // Use the storage version or the first version
      const storageVersion = matchingCrd.spec.versions.find((v: any) => v.storage);
      version = storageVersion?.name || matchingCrd.spec.versions[0].name;
    }
  } catch (error) {
    console.warn(`Could not fetch CRD for ${group}/${plural}, using version ${version}:`, error);
  }

  let response: any;
  if (isClusterScope) {
    // List cluster-scoped custom resources
    response = await customObjectsApi.listClusterCustomObject({
      group,
      version,
      plural
    });
  } else {
    // List namespaced custom resources
    if (!namespace) {
      throw new Error("Namespace is required for namespaced custom resources");
    }
    response = await customObjectsApi.listNamespacedCustomObject({
      group,
      version,
      namespace,
      plural
    });
  }

  if (!response?.items) {
    throw new Error(`No custom resources found for ${group}/${plural}${namespace ? ` in namespace ${namespace}` : ""}`);
  }

  // Transform custom resources data
  const resources = response.items.map((resource: any) => {
    const resourceName = resource.metadata?.name;
    const creationTimestamp = resource.metadata?.creationTimestamp;

    return {
      name: resourceName,
      namespace: namespace,
      group: group,
      plural: plural,
      type: "custom-resource",
      created: creationTimestamp,
      labels: resource.metadata?.labels || {},
      annotations: resource.metadata?.annotations || {},
      spec: resource.spec || {},
      status: resource.status || {},
      actions: {
        describe: namespace
          ? `kubectl describe ${plural} ${resourceName} -n ${namespace}`
          : `kubectl describe ${plural} ${resourceName}`,
        get_yaml: namespace
          ? `kubectl get ${plural} ${resourceName} -n ${namespace} -o yaml`
          : `kubectl get ${plural} ${resourceName} -o yaml`,
        delete: namespace
          ? `kubectl delete ${plural} ${resourceName} -n ${namespace}`
          : `kubectl delete ${plural} ${resourceName}`,
      },
      management_info: {
        api_version: resource.apiVersion,
        kind: resource.kind,
        uid: resource.metadata?.uid,
        resource_version: resource.metadata?.resourceVersion,
        group: group,
        plural: plural,
      }
    };
  });

  const resourceData = {
    group: group,
    plural: plural,
    namespace: namespace,
    scope: namespace ? "namespaced" : "cluster",
    resources,
    summary: {
      total_count: resources.length,
      created_today: resources.filter((r: any) => {
        const created = new Date(r.created);
        const today = new Date();
        return created.toDateString() === today.toDateString();
      }).length,
    },
    kubernetes_info: {
      group: group,
      plural: plural,
      scope: namespace ? "namespaced" : "cluster",
      docs: "https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/",
    },
  };

  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: "application/json",
        text: JSON.stringify(resourceData, null, 2)
      }
    ]
  };
};

// Read callback function for unified kubernetes resources template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri) => {
  try {
    // Extract resource type and optional namespace from URI: kubernetes://resources/{resourceType}/{namespace?}
    const uriStr = uri.toString();
    const resourcesMatch = uriStr.match(/kubernetes:\/\/resources\/(.+)/);

    if (!resourcesMatch) {
      throw new Error("Invalid URI format. Use kubernetes://resources/{resourceType} for cluster-scoped or kubernetes://resources/{resourceType}/{namespace} for namespaced resources");
    }

    const pathParts = resourcesMatch[1].split("/").filter(part => part !== ""); // Remove empty parts from trailing slashes

    if (pathParts.length === 0) {
      throw new Error("Resource type is required");
    }

    const resourceType = pathParts[0];  // e.g., "pods" or "datadogagents"
    const namespace = pathParts[1]; // Optional namespace
    const isClusterScope = !namespace;

    // Check if this is a native resource first
    const isNativeResource = Object.keys(NATIVE_RESOURCE_CONFIG).includes(resourceType) ||
      Object.values(NATIVE_RESOURCE_CONFIG).some(config => config.aliases?.includes(resourceType));

    if (isNativeResource) {
      return await handleNativeResource(uri, resourceType, namespace, isClusterScope);
    } else {
      // It's a custom resource - resolve the full group/plural format
      let fullResourceType: string;
      try {
        const k8sClient = getKubernetesClient();
        const crdsResponse = await k8sClient.apiextensionsV1Api.listCustomResourceDefinition({});
        const matchingCrd = crdsResponse.items.find((crd: any) => crd.spec.names.plural === resourceType);
        if (matchingCrd) {
          fullResourceType = `${matchingCrd.spec.group}/${matchingCrd.spec.names.plural}`;
        } else {
          throw new Error(`Unknown custom resource type: ${resourceType}. Not found in available CRDs.`);
        }
      } catch (error) {
        throw new Error(`Could not resolve custom resource type: ${resourceType}. ${error instanceof Error ? error.message : String(error)}`);
      }

      return await handleCustomResource(uri, fullResourceType, namespace, isClusterScope);
    }

  } catch (error: any) {
    return {
      contents: [
        {
          uri: uri.toString(),
          mimeType: "application/json",
          text: JSON.stringify({
            error: `Failed to read Kubernetes resources: ${error.message}`,
            troubleshooting: {
              check_kubeconfig: "Ensure kubectl is configured and can access the cluster",
              check_permissions: "Verify your Kubernetes credentials have read permissions",
              check_resource_scope: "Verify if the resource is namespaced or cluster-scoped",
              supported_native_resources: Object.keys(NATIVE_RESOURCE_CONFIG).join(", "),
              example_usage: "kubernetes://resources/pods/default or kubernetes://resources/nodes or kubernetes://resources/applications/argocd",
            }
          }, null, 2)
        }
      ]
    };
  }
};

// Resource template definition for unified kubernetes resources
export const kubernetesUnifiedResourcesTemplate: ResourceTemplateDefinition = {
  name: "kubernetesResources",
  resourceTemplate: new ResourceTemplate(
    "kubernetes://resources/{resourceType}/{namespace?}",
    {
      list: undefined,
      complete: {
        resourceType: async (_arg: string): Promise<string[]> => {
          try {
            const k8sClient = getKubernetesClient();

            // Get native resource types
            const nativeTypes = Object.keys(NATIVE_RESOURCE_CONFIG);

            // Get custom resource types (CRDs) - show only the plural names, not group/plural
            let customTypes: string[] = [];
            try {
              const crdsResponse = await k8sClient.apiextensionsV1Api.listCustomResourceDefinition({});
              customTypes = crdsResponse.items.map((crd: any) => crd.spec.names.plural);
            } catch {
              // Fallback if CRDs can't be fetched - show just plural names
              customTypes = [];
            }

            return [...nativeTypes.sort(), ...customTypes.sort()];
          } catch {
            // Fallback to just native types
            return Object.keys(NATIVE_RESOURCE_CONFIG).sort();
          }
        },
        namespace: async (_arg: string, _context?: any): Promise<string[]> => {
          // TODO: When context is available, we could check if the selected resource type
          // is cluster-scoped and return an empty array to skip namespace selection

          try {
            const k8sClient = getKubernetesClient();
            const namespacesResponse = await k8sClient.coreV1Api.listNamespace({});
            const namespaces = namespacesResponse.items.map((ns: any) => ns.metadata.name as string);
            return namespaces.sort();
          } catch {
            return ["default", "kube-system"];
          }
        }
      }
    }
  ),
  metadata: {
    name: "Kubernetes Resources",
    description: "List Kubernetes native and custom resources by type and optional namespace. Supports both native resources (pods, services, etc.) and custom resources (plural format). Omit namespace for cluster-scoped resources",
  },
  requiredPermissions: ["kubernetes:read", "kubernetes:list", "admin"],
  readCallback,
};
