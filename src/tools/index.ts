// Re-export only what's needed externally
export { registerToolsWithServer, toolResponse } from "./registry.js";

import { registerTool } from "./registry.js";
import { mcpExplainerTool } from "./mcp/explainerTool.js";
import { mcpHealthCheckTool } from "./mcp/healthCheckTool.js";
import { generateKubernetesManifestTool } from "./kubernetes/resources/generateTool.js";
import { generateTerraformTool } from "./terraform/generateTool.js";
import { generateAwsCdkTool } from "./awscdk/generateTool.js";
import { createVaultEngineTool } from "./vault/engines/createTool.js";
import { requestAccessTool } from "./vault/engines/requestAccessTool.js";
import { createVaultPolicyTool } from "./vault/policies/createTool.js";
import { createVaultRoleTool } from "./vault/roles/createTool.js";
import { markK8sAdminTool } from "./vault/roles/markK8sRoleAdminTool.js";
import { createArtifactoryRepositoryTool } from "./artifactory/repositories/createTool.js";
import { createArgoCDApplicationTool } from "./argo/applications/createTool.js";
import { createArgoCDProjectTool } from "./argo/projects/createTool.js";
import { createEntraGroupTool } from "./entra/groups/createTool.js";

export const initializeTools = (): void => {
  registerTool(mcpExplainerTool);
  registerTool(mcpHealthCheckTool);

  registerTool(generateTerraformTool);

  registerTool(generateKubernetesManifestTool);

  registerTool(generateAwsCdkTool);

  registerTool(createVaultEngineTool);
  registerTool(requestAccessTool);
  registerTool(createVaultPolicyTool);
  registerTool(createVaultRoleTool);
  registerTool(markK8sAdminTool);

  // This is for creating repositories in Artifactory, which we don't really need since we primarily
  // use it for Docker images which all live within the docker repository.
  // registerTool(createArtifactoryRepositoryTool);

  registerTool(createArgoCDApplicationTool);
  registerTool(createArgoCDProjectTool);

  registerTool(createEntraGroupTool);
};
