import { registerTool } from "./registry.js";
import { helloWorldTool } from "./helloWorldTool.js";
import { samplingTool } from "./samplingTool.js";
import { restartServiceTool } from "./restartServiceTool.js";
import { addClusterTool } from "./addClusterTool.js";

// Register all available tools
export const initializeTools = (): void => {
  registerTool(helloWorldTool);
  registerTool(samplingTool);
  registerTool(restartServiceTool);
  registerTool(addClusterTool);
};
