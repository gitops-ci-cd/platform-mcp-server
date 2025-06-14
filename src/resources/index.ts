// Re-export only what's needed externally
export {
  registerResourcesWithServer,
  registerResourceTemplatesWithServer,
} from "./registry.js";

// Initialize all available resources and templates
import { registerResource, registerResourceTemplate } from "./registry.js";
import { listClustersResource } from "./listClustersResource.js";
import { clusterDetailsTemplate } from "./clusterDetailsResource.js";
import { namespacesTemplate } from "./namespacesResource.js";

export const initializeResources = (): void => {
  registerResource(listClustersResource);
  registerResourceTemplate(clusterDetailsTemplate);
  registerResourceTemplate(namespacesTemplate);
};
