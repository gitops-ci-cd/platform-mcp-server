import * as k8s from "@kubernetes/client-node";
import { getKubernetesConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

// Get Kubernetes client with configured API clients
const getKubernetesClient = ({ config, context }: {
  config: k8s.KubeConfig;
  context?: string;
}): {
  config: k8s.KubeConfig;
  core: k8s.CoreV1Api;
  apps: k8s.AppsV1Api;
  batch: k8s.BatchV1Api;
  networking: k8s.NetworkingV1Api;
  rbac: k8s.RbacAuthorizationV1Api;
  apiextensions: k8s.ApiextensionsV1Api;
  kubernetesObject: k8s.KubernetesObjectApi;
  customObjects: k8s.CustomObjectsApi;
} => {
  if (context) {
    config.setCurrentContext(context);
  }
  const core = config.makeApiClient(k8s.CoreV1Api);
  const apps = config.makeApiClient(k8s.AppsV1Api);
  const batch = config.makeApiClient(k8s.BatchV1Api);
  const networking = config.makeApiClient(k8s.NetworkingV1Api);
  const rbac = config.makeApiClient(k8s.RbacAuthorizationV1Api);
  const apiextensions = config.makeApiClient(k8s.ApiextensionsV1Api);
  const kubernetesObject = config.makeApiClient(k8s.KubernetesObjectApi);
  const customObjects = config.makeApiClient(k8s.CustomObjectsApi);

  return {
    config,
    core,
    apps,
    batch,
    networking,
    rbac,
    apiextensions,
    kubernetesObject,
    customObjects
  };
};

export const isCustomResource = async (name: string): Promise<boolean> => {
  const all = await listAvailableCustomResources();

  return !!all.find(resource => resource.name === name);
};

export const findResourceByName = async (name: string): Promise<k8s.V1APIResource | undefined> => {
  const resources = await listAvailableResources(name);

  return resources.find(resource => resource.name === name);
};

// Get resource using the Kubernetes API
export const readResource = async ({ version, group, plural, kind, name, namespace }: {
  version: string,
  group: string,
  plural: string,
  kind: string,
  name: string,
  namespace?: string
}): Promise<k8s.KubernetesObject> => {
  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  if (await isCustomResource(plural)) {
    return await readCustomResource({ version, group, plural, name, namespace });
  }

  return await client.kubernetesObject.read({
    metadata: { name, namespace },
    apiVersion: [group, version].filter(Boolean).join("/"),
    kind
  });
};

// Get custom resource using the Kubernetes API
const readCustomResource = async ({ version, group, plural, name, namespace }: {
  version: string,
  group: string,
  plural: string,
  name: string,
  namespace?: string
}): Promise<k8s.KubernetesObject> => {
  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  let response: any;
  if (namespace) {
    response = await client.customObjects.getNamespacedCustomObject({
      group,
      version,
      namespace,
      plural,
      name
    });
  } else {
    response = await client.customObjects.getClusterCustomObject({
      group,
      version,
      plural,
      name
    });
  }

  return response;
};

// List resources using the Kubernetes API
export const listResources = async ({ plural, namespace }: {
  plural: string,
  namespace?: string,
}): Promise<k8s.KubernetesObject[]> => {
  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });
  const resource = await findResourceByName(plural);

  if (!resource) {
    console.error(`Resource ${plural} not found in available resources.`);
    return [];
  } else if (!resource.verbs?.includes("list")) {
    return [];
  }

  try {
    if (await isCustomResource(plural)) {
      return await listCustomResources({ version: resource.version!, group: resource.group!, plural, namespace });
    }

    const response = await client.kubernetesObject.list(
      [resource.group, resource.version].filter(Boolean).join("/"),
      resource.kind,
      namespace
    );

    return (response.items || []);
  } catch (error: any) {
    console.error(`Failed to list ${resource.kind} resources: ${error.message}`);

    return [];
  }
};

// List custom resources using the Kubernetes API
const listCustomResources = async ({ version, group, plural, namespace }: {
  version: string,
  group: string,
  plural: string,
  namespace?: string,
}): Promise<k8s.KubernetesObject[]> => {
  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  try {
    let response: any;
    if (namespace) {
      response = await client.customObjects.listNamespacedCustomObject({
        version,
        group,
        plural,
        namespace,
      });
    } else {
      response = await client.customObjects.listClusterCustomObject({
        version,
        group,
        plural,
      });
    }

    return (response.items || []);
  } catch (error: any) {
    console.error(`Failed to list custom resources ${group}/${version}/${plural}: ${error.message}`);

    return [];
  }
};

// List all clusters (contexts) in the kube config
export const listClusters = (name?: string): string[] => {
  const cacheKey = "k8s-clusters";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  const config = getKubernetesConfig();

  try {
    return resourceCache.set(cacheKey, config.getContexts().map(context => context.name), 30 * 60 * 1000);
  } catch (error: any) {
    console.error(`Failed to list Kubernetes clusters: ${error.message}`);

    return [];
  }
};

export const listAvailableResources = async (value?: string): Promise<k8s.V1APIResource[]> => {
  const cacheKey = "k8s-available-resources";
  const cache = checkCache({ cacheKey, value, lookupKey: "name" });
  if (cache.length > 0) return cache;

  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  try {
    const responses = await Promise.all([
      client.core.getAPIResources(),
      client.apps.getAPIResources(),
      client.batch.getAPIResources(),
      client.networking.getAPIResources(),
      client.rbac.getAPIResources(),
    ]);

    const resources = responses.flatMap((response) => {
      const [group, version] = response.groupVersion.split("/");

      return response.resources.map((resource) => {
        return {
          ...resource,
          group: resource.group || group,
          version: resource.version || version,
        };
      });
    });

    const customResources = (await listAvailableCustomResources()).map(resource => ({
      ...resource,
      group: resource.group || "",
      version: resource.version || "",
    }));

    const sanitizedResources = [...resources, ...customResources].filter(resource => {
      return !resource.name.includes("/");
    });

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, sanitizedResources, 30 * 60 * 1000);
  } catch (error: any) {
    console.error(`Failed to list native Kubernetes resources: ${error.message}`);

    return [];
  }
};

const listAvailableCustomResources = async (): Promise<k8s.V1APIResource[]> => {
  const cacheKey = "k8s-available-custom-resources";
  const cache = checkCache({ cacheKey });
  if (cache.length > 0) return cache;

  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  try {
    const response = await client.apiextensions.listCustomResourceDefinition();

    const list = response.items.map((crd) => {
      const spec = crd.spec;
      return {
        name: spec.names.plural,
        singularName: spec.names.singular || spec.names.kind.toLowerCase(),
        kind: spec.names.kind,
        group: crd.spec.group,
        version: spec.versions[0].name, // Use the first version for simplicity
        namespaced: spec.scope === "Namespaced",
        shortNames: spec.names.shortNames || [],
        verbs: spec.versions[0].served ? ["get", "list", "watch", "create", "update", "patch", "delete"] : [],
      };
    });

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, list, 30 * 60 * 1000);
  } catch (error: any) {
    console.error(`Failed to list custom resources: ${error.message}`);

    return [];
  }
};

// List all namespaces in the Kubernetes cluster
export const listNamespaces = async (name?: string): Promise<string[]> => {
  const cacheKey = "k8s-namespaces";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  try {
    // const response = await client.core.listNamespace();
    const response = await client.kubernetesObject.list("v1", "Namespace");

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, response.items.map((ns) => ns.metadata?.name), 30 * 60 * 1000);
  } catch (error: any) {
    console.error(`Failed to list Kubernetes namespaces: ${error.message}`);

    return [];
  }
};

// Delete resource using the Kubernetes API
export const deleteResource = async ({ kind, name, namespace, gracePeriodSeconds }: {
  kind: string,
  name: string,
  namespace?: string,
  gracePeriodSeconds?: number
}): Promise<void> => {
  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  await client.kubernetesObject.delete(
    {
      kind,
      metadata: { name, namespace },
    },
    undefined, // pretty
    undefined, // dryRun
    gracePeriodSeconds
  );
};

// Get events related to a resource
export const readResourceEvents = async ({ kind, name, namespace = "default" }: {
  kind: string,
  name: string,
  namespace: string,
}): Promise<k8s.CoreV1Event[]> => {
  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  try {
    const response = await client.core.listNamespacedEvent({
      namespace,
      fieldSelector: `involvedObject.name=${name},involvedObject.kind=${kind}`
    });

    return response.items || [];
  } catch (error: any) {
    console.error(`Failed to get events for ${kind}/${name} in namespace ${namespace}: ${error.message}`);

    return [];
  }
};

export const listAvailableClusterResources = async (value?: string): Promise<string[]> => {
  const cacheKey = "k8s-available-cluster-resources";
  const cache = checkCache({ cacheKey, value });
  if (cache.length > 0) return cache;

  try {
    const allResources = await listAvailableResources();
    const clusterResources = allResources.filter(resource => !resource.namespaced).map(resource => resource.name);

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, clusterResources, 30 * 60 * 1000);
  } catch (error: any) {
    console.error(`Failed to list available cluster resources: ${error.message}`);

    return [];
  }
};

// List only resource types that have instances in the given namespace
export const listAvailableResourcesInNamespace = async (namespace: string, value?: string): Promise<string[]> => {
  const cacheKey = `k8s-available-resources-${namespace}`;
  const cache = checkCache({ cacheKey, value});
  if (cache.length > 0) return cache;

  try {
    // Get all available resource types
    const allResources = await listAvailableResources();
    const namespacedResources = allResources.filter(resource => resource.namespaced);

    // Filter to only resources that have instances
    const resourcesWithInstances: string[] = [];

    // Process resources in smaller batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < namespacedResources.length; i += batchSize) {
      const batch = namespacedResources.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (resource) => {
          try {
            // Try to list instances of this resource type in the namespace
            const response = await listResources({
              plural: resource.name,
              namespace
            });

            // If we get results, include this resource type
            if (response && response.length > 0) {
              return resource.name;
            }
            return null;
          } catch (error: any) {
            // Only log errors for resources we expect to work
            if (!error.message.includes("404") && !error.message.includes("not found")) {
              console.error(`Failed to list instances for resource ${resource.name} in namespace ${namespace}: ${error.message}`);
            }
            return null;
          }
        })
      );

      // Collect successful results from this batch
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          resourcesWithInstances.push(result.value);
        }
      });

      // Add a small delay between batches to avoid overwhelming the API
      if (i + batchSize < namespacedResources.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return resourceCache.set(cacheKey, resourcesWithInstances, 10 * 60 * 1000); // Cache for 10 minutes
  } catch (error: any) {
    console.error(`Failed to list available resources in namespace ${namespace}: ${error.message}`);

    return [];
  }
};
