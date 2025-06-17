// Re-export only what's needed externally
export {
  registerToolsWithServer,
} from "./registry.js";

import { registerTool } from "./registry.js";

import { mcpExplainerTool } from "./mcp/explainerTool.js";
import { mcpHealthCheckTool } from "./mcp/healthCheckTool.js";

import { getKubernetesResourcesTool } from "./kubernetes/resources/getTool.js";
import { describeKubernetesResourceTool } from "./kubernetes/resources/describeTool.js";
import { validateKubernetesResourceTool } from "./kubernetes/resources/validateTool.js";
import { deleteKubernetesResourceTool } from "./kubernetes/resources/deleteTool.js";

import { generateManifestTool } from "./manifests/generateTool.js";
import { generateTerraformTool } from "./terraform/generateTool.js";

export const initializeTools = (): void => {
  registerTool(mcpExplainerTool);
  registerTool(mcpHealthCheckTool);

  registerTool(getKubernetesResourcesTool);
  registerTool(describeKubernetesResourceTool);
  registerTool(validateKubernetesResourceTool);
  registerTool(deleteKubernetesResourceTool);

  registerTool(generateManifestTool);
  registerTool(generateTerraformTool);
};
