// Re-export only what's needed externally
export {
  registerPromptsWithServer,
} from "./registry.js";

// Initialize all available prompts
import { registerPrompt } from "./registry.js";
import { mcpConceptsPrompt } from "./mcpConceptsPrompt.js";
import { mcpGettingStartedPrompt } from "./mcpGettingStartedPrompt.js";
import { mcpExampleBasedPrompt } from "./mcpExampleBasedPrompt.js";
import { mcpAdvancedPrompt } from "./mcpRoleExamplePrompt.js";

export const initializePrompts = (): void => {
  registerPrompt(mcpConceptsPrompt);
  registerPrompt(mcpGettingStartedPrompt);
  registerPrompt(mcpExampleBasedPrompt);
  registerPrompt(mcpAdvancedPrompt);
};
