// Re-export only what's needed externally
export { registerResourcesWithServer, registerResourceTemplatesWithServer } from "./registry.js";

import { registerResource, registerResourceTemplate } from "./registry.js";
import { mcpConceptTemplate } from "./mcp/conceptsTemplate.js";
import { vaultEngineTemplate } from "./vault/engineTemplate.js";
import { vaultPolicyTemplate } from "./vault/policyTemplate.js";
import { vaultRoleTemplate } from "./vault/roleTemplate.js";
import { vaultAuthMethodTemplate } from "./vault/authMethodTemplate.js";
import { vaultSecretMetadataTemplate } from "./vault/secretMetadataTemplate.js";
import { vaultGroupTemplate } from "./vault/groupTemplate.js";
import { argoCDApplicationTemplate } from "./argocd/applicationTemplate.js";
import { argoCDProjectTemplate } from "./argocd/projectTemplate.js";
import { entraGroupTemplate } from "./entra/groupTemplate.js";
import { artifactoryRepositoryTemplate } from "./artifactory/repositoryTemplate.js";
import { kubernetesUnifiedResourceTemplate } from "./kubernetes/unifiedResourceTemplate.js";

export const initializeResources = (): void => {};

export const initializeResourceTemplates = (): void => {
  registerResourceTemplate(mcpConceptTemplate);

  registerResourceTemplate(vaultSecretMetadataTemplate);
  registerResourceTemplate(vaultPolicyTemplate);
  registerResourceTemplate(vaultAuthMethodTemplate);
  registerResourceTemplate(vaultEngineTemplate);
  registerResourceTemplate(vaultRoleTemplate);
  registerResourceTemplate(vaultGroupTemplate);

  registerResourceTemplate(kubernetesUnifiedResourceTemplate);

  registerResourceTemplate(artifactoryRepositoryTemplate);

  registerResourceTemplate(entraGroupTemplate);

  registerResourceTemplate(argoCDApplicationTemplate);
  registerResourceTemplate(argoCDProjectTemplate);
};
