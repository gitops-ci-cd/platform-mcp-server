// Re-export only what's needed externally
export {
  registerResourcesWithServer,
  registerResourceTemplatesWithServer,
} from "./registry.js";

// Initialize all available resources and templates
import { registerResource, registerResourceTemplate } from "./registry.js";
import { mcpConceptsTemplate } from "./mcpConceptsTemplate.js";
import { mcpQuickstartResource } from "./mcpQuickstartResource.js";

export const initializeResources = (): void => {
  registerResource(mcpQuickstartResource);

  registerResourceTemplate(mcpConceptsTemplate);
};
