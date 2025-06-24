// Kubernetes client utilities
import * as k8s from "@kubernetes/client-node";
import type { KubernetesResource, KubernetesError, SupportedResourceKind, KubernetesConfig } from "./types.js";

// Resource kind mappings for API calls
const RESOURCE_KIND_MAP: Record<SupportedResourceKind, {
  apiGroup: "core" | "apps" | "networking";
  isNamespaced: boolean;
  aliases?: string[];
  operations: {
    read: (client: any, options: { name: string; namespace?: string }) => Promise<any>;
    delete: (client: any, options: { name: string; namespace?: string; gracePeriodSeconds?: number }) => Promise<any>;
    list: (client: any, options: { namespace?: string; labelSelector?: string; fieldSelector?: string; limit?: number }) => Promise<any>;
  };
}> = {
  Pod: {
    apiGroup: "core",
    isNamespaced: true,
    aliases: ["pod", "pods", "po"],
    operations: {
      read: (client, { name, namespace }) => client.coreV1Api.readNamespacedPod({ name, namespace }),
      delete: (client, { name, namespace, gracePeriodSeconds }) => client.coreV1Api.deleteNamespacedPod({ name, namespace, gracePeriodSeconds }),
      list: (client, options) => client.coreV1Api.listNamespacedPod(options)
    }
  },
  Service: {
    apiGroup: "core",
    isNamespaced: true,
    aliases: ["service", "services", "svc"],
    operations: {
      read: (client, { name, namespace }) => client.coreV1Api.readNamespacedService({ name, namespace }),
      delete: (client, { name, namespace }) => client.coreV1Api.deleteNamespacedService({ name, namespace }),
      list: (client, options) => client.coreV1Api.listNamespacedService(options)
    }
  },
  Deployment: {
    apiGroup: "apps",
    isNamespaced: true,
    aliases: ["deployment", "deployments", "deploy"],
    operations: {
      read: (client, { name, namespace }) => client.appsV1Api.readNamespacedDeployment({ name, namespace }),
      delete: (client, { name, namespace }) => client.appsV1Api.deleteNamespacedDeployment({ name, namespace }),
      list: (client, options) => client.appsV1Api.listNamespacedDeployment(options)
    }
  },
  ReplicaSet: {
    apiGroup: "apps",
    isNamespaced: true,
    aliases: ["replicaset", "replicasets", "rs"],
    operations: {
      read: (client, { name, namespace }) => client.appsV1Api.readNamespacedReplicaSet({ name, namespace }),
      delete: (client, { name, namespace }) => client.appsV1Api.deleteNamespacedReplicaSet({ name, namespace }),
      list: (client, options) => client.appsV1Api.listNamespacedReplicaSet(options)
    }
  },
  DaemonSet: {
    apiGroup: "apps",
    isNamespaced: true,
    aliases: ["daemonset", "daemonsets", "ds"],
    operations: {
      read: (client, { name, namespace }) => client.appsV1Api.readNamespacedDaemonSet({ name, namespace }),
      delete: (client, { name, namespace }) => client.appsV1Api.deleteNamespacedDaemonSet({ name, namespace }),
      list: (client, options) => client.appsV1Api.listNamespacedDaemonSet(options)
    }
  },
  StatefulSet: {
    apiGroup: "apps",
    isNamespaced: true,
    aliases: ["statefulset", "statefulsets", "sts"],
    operations: {
      read: (client, { name, namespace }) => client.appsV1Api.readNamespacedStatefulSet({ name, namespace }),
      delete: (client, { name, namespace }) => client.appsV1Api.deleteNamespacedStatefulSet({ name, namespace }),
      list: (client, options) => client.appsV1Api.listNamespacedStatefulSet(options)
    }
  },
  ConfigMap: {
    apiGroup: "core",
    isNamespaced: true,
    aliases: ["configmap", "configmaps", "cm"],
    operations: {
      read: (client, { name, namespace }) => client.coreV1Api.readNamespacedConfigMap({ name, namespace }),
      delete: (client, { name, namespace }) => client.coreV1Api.deleteNamespacedConfigMap({ name, namespace }),
      list: (client, options) => client.coreV1Api.listNamespacedConfigMap(options)
    }
  },
  Secret: {
    apiGroup: "core",
    isNamespaced: true,
    aliases: ["secret", "secrets"],
    operations: {
      read: (client, { name, namespace }) => client.coreV1Api.readNamespacedSecret({ name, namespace }),
      delete: (client, { name, namespace }) => client.coreV1Api.deleteNamespacedSecret({ name, namespace }),
      list: (client, options) => client.coreV1Api.listNamespacedSecret(options)
    }
  },
  Ingress: {
    apiGroup: "networking",
    isNamespaced: true,
    aliases: ["ingress", "ingresses", "ing"],
    operations: {
      read: (client, { name, namespace }) => client.networkingV1Api.readNamespacedIngress({ name, namespace }),
      delete: (client, { name, namespace }) => client.networkingV1Api.deleteNamespacedIngress({ name, namespace }),
      list: (client, options) => client.networkingV1Api.listNamespacedIngress(options)
    }
  },
  Namespace: {
    apiGroup: "core",
    isNamespaced: false,
    aliases: ["namespace", "namespaces", "ns"],
    operations: {
      read: (client, { name }) => client.coreV1Api.readNamespace({ name }),
      delete: (client, { name }) => client.coreV1Api.deleteNamespace({ name }),
      list: (client, options) => client.coreV1Api.listNamespace(options)
    }
  },
  Node: {
    apiGroup: "core",
    isNamespaced: false,
    aliases: ["node", "nodes"],
    operations: {
      read: (client, { name }) => client.coreV1Api.readNode({ name }),
      delete: () => { throw new Error("Node deletion is not supported for safety reasons"); },
      list: (client, options) => client.coreV1Api.listNode(options)
    }
  }
};

/**
 * Get Kubernetes client with automatic configuration detection
 * First tries provided config, then default kubeconfig locations, then in-cluster config
 */
export function getKubernetesClient(config?: KubernetesConfig): {
  kubeConfig: k8s.KubeConfig;
  coreV1Api: k8s.CoreV1Api;
  appsV1Api: k8s.AppsV1Api;
  customObjectsApi: k8s.CustomObjectsApi;
  networkingV1Api: k8s.NetworkingV1Api;
  apiextensionsV1Api: k8s.ApiextensionsV1Api;
} {
  const kubeConfig = new k8s.KubeConfig();

  try {
    if (config?.kubeconfig) {
      // Use explicitly provided kubeconfig path
      kubeConfig.loadFromFile(config.kubeconfig);
    } else if (process.env.KUBECONFIG) {
      // Use KUBECONFIG environment variable (first file if multiple)
      const delimiter = process.platform === "win32" ? ";" : ":";
      const kubeconfigFiles = process.env.KUBECONFIG.split(delimiter).map(file => file.trim()).filter(Boolean);
      kubeConfig.loadFromFile(kubeconfigFiles[0]);
    } else if (process.env.KUBERNETES_SERVICE_HOST && process.env.KUBERNETES_SERVICE_PORT) {
      // We're running in a Kubernetes pod - use in-cluster configuration
      kubeConfig.loadFromCluster();
    } else {
      // Try to load from default kubeconfig location (~/.kube/config)
      kubeConfig.loadFromDefault();
    }

    if (config?.context) {
      kubeConfig.setCurrentContext(config.context);
    }
  } catch (error) {
    throw new Error(`Failed to load Kubernetes configuration: ${error instanceof Error ? error.message : String(error)}`);
  }

  const coreV1Api = kubeConfig.makeApiClient(k8s.CoreV1Api);
  const appsV1Api = kubeConfig.makeApiClient(k8s.AppsV1Api);
  const customObjectsApi = kubeConfig.makeApiClient(k8s.CustomObjectsApi);
  const networkingV1Api = kubeConfig.makeApiClient(k8s.NetworkingV1Api);
  const apiextensionsV1Api = kubeConfig.makeApiClient(k8s.ApiextensionsV1Api);

  return {
    kubeConfig,
    coreV1Api,
    appsV1Api,
    customObjectsApi,
    networkingV1Api,
    apiextensionsV1Api
  };
}

export function getResourceConfig(kind: SupportedResourceKind) {
  return RESOURCE_KIND_MAP[kind];
}

/**
 * Get resource using the Kubernetes API
 */
export async function getResource(
  kind: SupportedResourceKind,
  name: string,
  namespace?: string,
  config?: KubernetesConfig
): Promise<KubernetesResource> {
  const client = getKubernetesClient(config);
  const resourceConfig = getResourceConfig(kind);
  const ns = namespace || config?.namespace || "default";

  try {
    const options = resourceConfig.isNamespaced
      ? { name, namespace: ns }
      : { name };

    const resource = await resourceConfig.operations.read(client, options);
    return resource as KubernetesResource;
  } catch (error: any) {
    const k8sError = new Error(`Failed to get ${kind}/${name}: ${error.message}`) as KubernetesError;
    k8sError.statusCode = error.statusCode;
    k8sError.response = error.response;
    throw k8sError;
  }
}

/**
 * List resources using the Kubernetes API
 */
export async function listResources(
  kind: SupportedResourceKind,
  namespace?: string,
  config?: KubernetesConfig,
  labelSelector?: string,
  fieldSelector?: string,
  limit?: number
): Promise<KubernetesResource[]> {
  const client = getKubernetesClient(config);
  const resourceConfig = getResourceConfig(kind);
  const ns = namespace || config?.namespace || "default";

  try {
    const options = resourceConfig.isNamespaced
      ? { namespace: ns, labelSelector, fieldSelector, limit }
      : { labelSelector, fieldSelector, limit };

    const resources = await resourceConfig.operations.list(client, options);
    return (resources.items || []) as KubernetesResource[];
  } catch (error: any) {
    const k8sError = new Error(`Failed to list ${kind}: ${error.message}`) as KubernetesError;
    k8sError.statusCode = error.statusCode;
    k8sError.response = error.response;
    throw k8sError;
  }
}

/**
 * Delete resource using the Kubernetes API
 */
export async function deleteResource(
  kind: SupportedResourceKind,
  name: string,
  namespace?: string,
  config?: KubernetesConfig,
  gracePeriodSeconds?: number
): Promise<void> {
  const client = getKubernetesClient(config);
  const resourceConfig = getResourceConfig(kind);
  const ns = namespace || config?.namespace || "default";

  try {
    const options = resourceConfig.isNamespaced
      ? { name, namespace: ns, gracePeriodSeconds }
      : { name, gracePeriodSeconds };

    await resourceConfig.operations.delete(client, options);
  } catch (error: any) {
    const k8sError = new Error(`Failed to delete ${kind}/${name}: ${error.message}`) as KubernetesError;
    k8sError.statusCode = error.statusCode;
    k8sError.response = error.response;
    throw k8sError;
  }
}

/**
 * Get events related to a resource
 */
export async function getResourceEvents(
  kind: string,
  name: string,
  namespace?: string,
  config?: KubernetesConfig
): Promise<k8s.CoreV1Event[]> {
  const client = getKubernetesClient(config);
  const ns = namespace || config?.namespace || "default";

  try {
    const eventList = await client.coreV1Api.listNamespacedEvent({
      namespace: ns,
      fieldSelector: `involvedObject.name=${name},involvedObject.kind=${kind}`
    });

    return eventList.items || [];
  } catch (error: any) {
    const k8sError = new Error(`Failed to get events for ${kind}/${name}: ${error.message}`) as KubernetesError;
    k8sError.statusCode = error.statusCode;
    k8sError.response = error.response;
    throw k8sError;
  }
}
