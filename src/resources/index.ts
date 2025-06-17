// Re-export only what's needed externally
export {
  registerResourcesWithServer,
  registerResourceTemplatesWithServer,
} from "./registry.js";

// Initialize all available resources and templates
import { registerResource, registerResourceTemplate } from "./registry.js";
import { mcpConceptsTemplate } from "./mcpConceptsTemplate.js";

export const initializeResources = (): void => {
  registerResourceTemplate(mcpConceptsTemplate);
};
