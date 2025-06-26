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

export const isCustomResource = async ({ group, version }: {
  group: string, version: string
}): Promise<boolean> => {
  const all = await listAvailableCustomResources();

  return !!all.find(resource => resource.group === group && resource.version === version);
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

  if (await isCustomResource({ group, version })) {
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
export const listResources = async ({ version, group, plural, kind, namespace }: {
  version: string,
  group: string,
  plural: string,
  kind: string,
  namespace?: string,
}): Promise<k8s.KubernetesObject[]> => {
  const config = getKubernetesConfig();
  const client = getKubernetesClient({ config });

  try {
    if (await isCustomResource({ group, version })) {
      return await listCustomResources({ version, group, plural, namespace });
    }

    const response = await client.kubernetesObject.list(
      [group, version].filter(Boolean).join("/"),
      kind,
      namespace
    );

    return (response.items || []);
  } catch (error: any) {
    console.error(`Failed to list ${kind} resources: ${error.message}`);

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

export const listAvailableResources = async (): Promise<k8s.V1APIResource[]> => {
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

    return [...resources, ...customResources];
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
export const listNamespaces = async (name?: string): Promise<any> => {
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

    return {};
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
