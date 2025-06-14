import { registerResource, registerResourceTemplate } from "./registry.js";
import { listClustersResource } from "./listClustersResource.js";
import { clusterDetailsTemplate } from "./clusterDetailsResource.js";
import { namespacesTemplate } from "./namespacesResource.js";

// Initialize all available resources and templates
export const initializeResources = (): void => {
  registerResource(listClustersResource);
  registerResourceTemplate(clusterDetailsTemplate);
  registerResourceTemplate(namespacesTemplate);
};
