import { registerTool } from "./registry.js";
import { restartServiceTool } from "./restartService.js";
import { helloWorldTool } from "./helloWorld.js";
import { addClusterTool } from "./addCluster.js";

// Register all available tools
export function initializeTools(): void {
  registerTool(helloWorldTool);
  registerTool(restartServiceTool);
  registerTool(addClusterTool);
}
