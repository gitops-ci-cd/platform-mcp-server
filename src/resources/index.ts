// Re-export only what's needed externally
export {
  registerResourcesWithServer,
  registerResourceTemplatesWithServer,
} from "./registry.js";

// Initialize all available resources and templates
import { registerResource, registerResourceTemplate } from "./registry.js";
import { mcpConceptsTemplate } from "./mcpConceptsTemplate.js";
import { vaultEnginesResource } from "./vault/engines.js";
import { vaultPoliciesResource } from "./vault/policies.js";
import { vaultRolesResource } from "./vault/roles.js";
import { vaultAuthMethodsResource } from "./vault/auths.js";
import { vaultSecretsTemplate } from "./vault/secrets.js";
import { argoCDApplicationsResource } from "./argocd/applications.js";
import { argoCDProjectsResource } from "./argocd/projects.js";
import { entraGroupsResource } from "./entra/groups.js";
import { artifactoryRepositoriesResource } from "./artifactory/repositories.js";
import { kubernetesUnifiedResourcesTemplate } from "./kubernetes/unified_resources.js";

export const initializeResources = (): void => {
  // Register templates
  registerResourceTemplate(mcpConceptsTemplate);
  registerResourceTemplate(vaultSecretsTemplate);
  registerResourceTemplate(kubernetesUnifiedResourcesTemplate);

  // Register direct resources
  registerResource(vaultEnginesResource);
  registerResource(vaultPoliciesResource);
  registerResource(vaultRolesResource);
  registerResource(vaultAuthMethodsResource);
  registerResource(argoCDApplicationsResource);
  registerResource(argoCDProjectsResource);
  registerResource(entraGroupsResource);
  registerResource(artifactoryRepositoriesResource);
};
