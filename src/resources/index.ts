// Re-export only what's needed externally
export {
  registerResourcesWithServer,
  registerResourceTemplatesWithServer,
} from "./registry.js";

import { registerResource, registerResourceTemplate } from "./registry.js";
import { mcpConceptsTemplate } from "./mcp/conceptsTemplate.js";
import { vaultEnginesTemplate } from "./vault/engines.js";
import { vaultPoliciesTemplate } from "./vault/policies.js";
import { vaultRolesTemplate } from "./vault/roles.js";
import { vaultAuthMethodsTemplate } from "./vault/auths.js";
import { vaultSecretsTemplate } from "./vault/secrets.js";
import { argoCDApplicationsResource } from "./argocd/applications.js";
import { argoCDProjectsResource } from "./argocd/projects.js";
import { entraGroupsResource } from "./entra/groups.js";
import { artifactoryRepositoriesResource } from "./artifactory/repositories.js";
import { kubernetesUnifiedResourcesTemplate } from "./kubernetes/unifiedResources.js";

export const initializeResources = (): void => {
  // Register templates
  registerResourceTemplate(mcpConceptsTemplate);
  registerResourceTemplate(vaultSecretsTemplate);
  registerResourceTemplate(vaultPoliciesTemplate);
  registerResourceTemplate(vaultAuthMethodsTemplate);
  registerResourceTemplate(vaultEnginesTemplate);
  registerResourceTemplate(vaultRolesTemplate);
  registerResourceTemplate(kubernetesUnifiedResourcesTemplate);

  // Register direct resources
  registerResource(argoCDApplicationsResource);
  registerResource(argoCDProjectsResource);
  registerResource(entraGroupsResource);
  registerResource(artifactoryRepositoriesResource);
};
