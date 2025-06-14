import { ResourceDefinition } from "./registry.js";

const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
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

export const listClustersResource: ResourceDefinition = {
  name: "Available Kubernetes clusters",
  uri: "k8s://clusters/list",
  metadata: {
    description: "List of available Kubernetes clusters and their status",
    mimeType: "application/json",
  },
  readCallback,
};
