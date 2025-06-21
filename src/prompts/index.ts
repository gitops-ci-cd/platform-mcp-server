// Re-export only what's needed externally
export {
  registerPromptsWithServer,
} from "./registry.js";

import { registerPrompt } from "./registry.js";
import { mcpConceptsPrompt } from "./mcp/conceptsPrompt.js";
import { mcpRoleExamplePrompt } from "./mcp/roleExamplePrompt.js";

export const initializePrompts = (): void => {
  registerPrompt(mcpConceptsPrompt);
  registerPrompt(mcpRoleExamplePrompt);
};
