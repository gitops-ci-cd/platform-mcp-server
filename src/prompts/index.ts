// Re-export only what's needed externally
export {
  registerPromptsWithServer,
} from "./registry.js";

// Initialize all available prompts
import { registerPrompt } from "./registry.js";
import { bestPracticesPrompt } from "./bestPracticesPrompt.js";
import { troubleshootingPrompt } from "./troubleshootingPrompt.js";

export const initializePrompts = (): void => {
  registerPrompt(bestPracticesPrompt);
  registerPrompt(troubleshootingPrompt);
};
