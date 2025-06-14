import { registerPrompt } from "./registry.js";
import { bestPracticesPrompt } from "./bestPracticesPrompt.js";
import { troubleshootingPrompt } from "./troubleshootingPrompt.js";

// Initialize all available prompts
export const initializePrompts = (): void => {
  registerPrompt(bestPracticesPrompt);
  registerPrompt(troubleshootingPrompt);
};
