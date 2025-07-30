// Re-export only what's needed externally
export {
  registerPromptsWithServer,
} from "./registry.js";

import { registerPrompt } from "./registry.js";
import { mcpConceptPrompt } from "./mcp/conceptPrompt.js";
import { mcpRoleExamplePrompt } from "./mcp/roleExamplePrompt.js";

export const initializePrompts = (): void => {
  registerPrompt(mcpConceptPrompt);
  registerPrompt(mcpRoleExamplePrompt);
};
