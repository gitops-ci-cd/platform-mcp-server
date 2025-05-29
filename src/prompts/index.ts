import { registerPrompt } from "./registry.js";
import { bestPracticesPrompt, troubleshootingPrompt } from "./k8sBestPractices.js";

// Initialize all available prompts
export function initializePrompts(): void {
  registerPrompt(bestPracticesPrompt);
  registerPrompt(troubleshootingPrompt);
}
