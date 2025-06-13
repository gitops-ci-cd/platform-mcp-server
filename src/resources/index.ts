import { registerResource, registerResourceTemplate } from "./registry.js";
import { listClustersResource, clusterDetailsTemplate, namespacesTemplate } from "./clusters.js";

// Initialize all available resources and templates
export const initializeResources = (): void => {
  registerResource(listClustersResource);
  registerResourceTemplate(clusterDetailsTemplate);
  registerResourceTemplate(namespacesTemplate);
};
