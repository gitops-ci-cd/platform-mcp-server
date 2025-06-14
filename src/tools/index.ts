// Re-export only what's needed externally
export {
  registerToolsWithServer,
} from "./registry.js";

// Initialize all available tools
import { registerTool } from "./registry.js";
import { mcpExplainerTool } from "./mcpExplainerTool.js";
import { mcpHealthCheckTool } from "./mcpHealthCheckTool.js";

export const initializeTools = (): void => {
  registerTool(mcpExplainerTool);
  registerTool(mcpHealthCheckTool);
};
