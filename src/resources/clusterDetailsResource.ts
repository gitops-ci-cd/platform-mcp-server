import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplateDefinition } from "./registry.js";

const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
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
  readCallback,
};
