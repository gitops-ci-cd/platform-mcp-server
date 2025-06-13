import { registerPrompt } from "./registry.js";
import { bestPracticesPrompt, troubleshootingPrompt } from "./k8sBestPractices.js";

// Initialize all available prompts
export const initializePrompts = (): void => {
  registerPrompt(bestPracticesPrompt);
  registerPrompt(troubleshootingPrompt);
};
