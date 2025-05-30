import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceDefinition, ResourceTemplateDefinition } from "./registry.js";

// Handler for listing all clusters
const listClustersHandler: ResourceDefinition["readCallback"] = async (uri) => {
  // In a real implementation, this would query the Kubernetes API
  const clusters = [
    { name: "production", status: "healthy", version: "1.26.1", nodes: 5 },
    { name: "staging", status: "healthy", version: "1.25.8", nodes: 3 },
    { name: "development", status: "degraded", version: "1.24.12", nodes: 2 },
  ];

  return {
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(clusters, null, 2),
        mimeType: "application/json",
      },
    ],
  };
};

// Handler for getting details about a specific cluster
const clusterDetailsHandler: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  // In a real implementation, this would query the Kubernetes API
  const clusterDetails = {
    name: variables.cluster,
    status: variables.cluster === "development" ? "degraded" : "healthy",
    version: variables.cluster === "production" ? "1.26.1" : "1.25.8",
    nodes: variables.cluster === "production" ? 5 : variables.cluster === "staging" ? 3 : 2,
    created: "2025-01-15T12:00:00Z",
    lastUpdated: "2025-05-20T08:30:00Z",
    region: "us-west-2",
    features: {
      autoScaling: true,
      monitoring: true,
      logging: true,
    },
  };

  return {
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(clusterDetails, null, 2),
        mimeType: "application/json",
      },
    ],
  };
};

// Handler for listing namespaces in a cluster
const namespacesHandler: ResourceTemplateDefinition["readCallback"] = async (uri, _variables) => {
  // In a real implementation, this would query the Kubernetes API
  const namespaces = [
    { name: "default", status: "active", pods: 5 },
    { name: "kube-system", status: "active", pods: 12 },
    { name: "monitoring", status: "active", pods: 8 },
    { name: "app", status: "active", pods: 15 },
  ];

  return {
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(namespaces, null, 2),
        mimeType: "application/json",
      },
    ],
  };
};

export const listClustersResource: ResourceDefinition = {
  name: "Available Kubernetes clusters",
  uri: "k8s://clusters/list",
  metadata: {
    description: "List of available Kubernetes clusters and their status",
    mimeType: "application/json",
  },
  readCallback: listClustersHandler,
};

export const clusterDetailsTemplate: ResourceTemplateDefinition = {
  name: "Kubernetes cluster details",
  resourceTemplate: new ResourceTemplate("k8s://clusters/{cluster}/info", {
    list: undefined,
    complete: {
      cluster: () => Promise.resolve(["foo", "bar", "baz"]) // This could be an API call to list clusters
    }
  }),
  metadata: {
    description: "Detailed information about a specific Kubernetes cluster",
    mimeType: "application/json",
  },
  readCallback: clusterDetailsHandler,
};

export const namespacesTemplate: ResourceTemplateDefinition = {
  name: "Kubernetes namespaces",
  resourceTemplate: new ResourceTemplate("k8s://clusters/{cluster}/namespaces", {
    list: undefined,
    complete: {
      cluster: () => Promise.resolve(["foo", "bar", "baz"]) // This could be an API call to list clusters
    }
  }),
  metadata: {
    description: "List of namespaces in a specific Kubernetes cluster",
    mimeType: "application/json",
  },
  readCallback: namespacesHandler,
};
