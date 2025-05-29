import { ResourceHandler, ResourceTemplateHandler } from "./registry.js";

// Handler for listing all clusters
const listClustersHandler: ResourceHandler = async () => {
  // In a real implementation, this would query the Kubernetes API
  const clusters = [
    { name: "production", status: "healthy", version: "1.26.1", nodes: 5 },
    { name: "staging", status: "healthy", version: "1.25.8", nodes: 3 },
    { name: "development", status: "degraded", version: "1.24.12", nodes: 2 },
  ];

  return JSON.stringify(clusters, null, 2);
};

// Handler for getting details about a specific cluster
const clusterDetailsHandler: ResourceTemplateHandler = async (uri: string) => {
  // Extract cluster name from URI
  const match = uri.match(/^k8s:\/\/clusters\/([^/]+)\/info$/);
  if (!match) {
    throw new Error(`Invalid URI format: ${uri}`);
  }

  const clusterName = match[1];

  // In a real implementation, this would query the Kubernetes API
  const clusterDetails = {
    name: clusterName,
    status: clusterName === "development" ? "degraded" : "healthy",
    version: clusterName === "production" ? "1.26.1" : "1.25.8",
    nodes: clusterName === "production" ? 5 : clusterName === "staging" ? 3 : 2,
    created: "2025-01-15T12:00:00Z",
    lastUpdated: "2025-05-20T08:30:00Z",
    region: "us-west-2",
    features: {
      autoScaling: true,
      monitoring: true,
      logging: true,
    },
  };

  return JSON.stringify(clusterDetails, null, 2);
};

// Handler for listing namespaces in a cluster
const namespacesHandler: ResourceTemplateHandler = async (uri: string) => {
  // Extract cluster name from URI
  const match = uri.match(/^k8s:\/\/clusters\/([^/]+)\/namespaces$/);
  if (!match) {
    throw new Error(`Invalid URI format: ${uri}`);
  }

  // In a real implementation, this would query the Kubernetes API
  const namespaces = [
    { name: "default", status: "active", pods: 5 },
    { name: "kube-system", status: "active", pods: 12 },
    { name: "monitoring", status: "active", pods: 8 },
    { name: "app", status: "active", pods: 15 },
  ];

  return JSON.stringify(namespaces, null, 2);
};

export const listClustersResource = {
  uri: "k8s://clusters/list",
  name: "Available Kubernetes clusters",
  mimeType: "application/json",
  description: "List of available Kubernetes clusters and their status",
  handler: listClustersHandler,
};

export const clusterDetailsTemplate = {
  uriTemplate: "k8s://clusters/{cluster}/info",
  name: "Kubernetes cluster details",
  mimeType: "application/json",
  description: "Detailed information about a specific Kubernetes cluster",
  handler: clusterDetailsHandler,
};

export const namespacesTemplate = {
  uriTemplate: "k8s://clusters/{cluster}/namespaces",
  name: "Kubernetes namespaces",
  mimeType: "application/json",
  description: "List of namespaces in a specific Kubernetes cluster",
  handler: namespacesHandler,
};
