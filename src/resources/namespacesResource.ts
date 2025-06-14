import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplateDefinition } from "./registry.js";

const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, _variables) => {
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
  readCallback,
};
