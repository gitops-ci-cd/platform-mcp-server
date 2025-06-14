// Re-export only what's needed externally
export {
  registerToolsWithServer,
} from "./registry.js";

// Initialize all available tools
import { registerTool } from "./registry.js";
import { helloWorldTool } from "./helloWorldTool.js";
import { samplingTool } from "./samplingTool.js";
import { restartServiceTool } from "./restartServiceTool.js";
import { addClusterTool } from "./addClusterTool.js";

export const initializeTools = (): void => {
  registerTool(helloWorldTool);
  registerTool(samplingTool);
  registerTool(restartServiceTool);
  registerTool(addClusterTool);
};
