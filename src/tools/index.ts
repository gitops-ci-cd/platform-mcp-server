import { registerTool } from "./registry.js";
import { helloWorldTool } from "./helloWorld.js";
import { samplingTool } from "./samplingExample.js";
import { restartServiceTool } from "./restartService.js";
import { addClusterTool } from "./addCluster.js";

// Register all available tools
export const initializeTools = (): void => {
  registerTool(helloWorldTool);
  registerTool(samplingTool);
  registerTool(restartServiceTool);
  registerTool(addClusterTool);
};
