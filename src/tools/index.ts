// Re-export only what's needed externally
export { registerToolsWithServer, toolResponse } from "./registry.js";

import { registerTool } from "./registry.js";
import { mcpExplainerTool } from "./mcp/explainerTool.js";
import { mcpHealthCheckTool } from "./mcp/healthCheckTool.js";
import { generateKubernetesManifestTool } from "./kubernetes/resources/generateTool.js";
import { generateTerraformTool } from "./terraform/generateTool.js";
import { generateAwsCdkTool } from "./awscdk/generateTool.js";
import { upsertVaultEngineTool } from "./vault/engines/upsertTool.js";
import { requestAccessTool } from "./vault/engines/requestAccessTool.js";
import { upsertVaultPolicyTool } from "./vault/policies/upsertTool.js";
import { upsertVaultRoleTool } from "./vault/roles/upsertTool.js";
import { upsertVaultGroupTool } from "./vault/groups/upsertTool.js";
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

  registerTool(upsertVaultEngineTool);
  // This is a feature we should consider in the future
  // registerTool(requestAccessTool);
  registerTool(upsertVaultPolicyTool);
  registerTool(upsertVaultRoleTool);
  registerTool(upsertVaultGroupTool);
  registerTool(markK8sAdminTool);

  // This is for creating repositories in Artifactory, which we don't really need since we primarily
  // use it for Docker images which all live within the docker repository.
  // registerTool(createArtifactoryRepositoryTool);

  registerTool(createArgoCDApplicationTool);
  registerTool(createArgoCDProjectTool);

  registerTool(createEntraGroupTool);
};
