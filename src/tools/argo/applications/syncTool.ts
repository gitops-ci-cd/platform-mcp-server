import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";

const inputSchema = z.object({
  applicationName: z.string().describe("Name of the ArgoCD application to sync"),
  dryRun: z.boolean().default(false).describe("Perform a dry-run sync"),
  prune: z.boolean().default(false).describe("Prune resources during sync"),
  force: z.boolean().default(false).describe("Force sync even if no changes"),
  resources: z.array(z.string()).optional().describe("Specific resources to sync")
});

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: Trigger ArgoCD application sync via direct API
  // Will initiate sync operation and return status
  // Output: Sync operation result

  return toolResponse({
    message: "ArgoCD application sync tool not implemented yet",
    links: {
      docs: "https://argo-cd.readthedocs.io/en/stable/user-guide/sync/",
      api: "https://argo-cd.readthedocs.io/en/stable/developer-guide/api-docs/"
    },
    metadata: {
      status: "not_implemented",
      potentialActions: [
        "Implement ArgoCD sync API integration",
        "Add authentication and authorization",
        "Handle sync operation responses"
      ]
    }
  }, true);
};

export const syncArgoApplicationTool: ToolDefinition = {
  title: "Sync ArgoCD Application",
  description: "Trigger ArgoCD application sync via direct API",
  inputSchema,
  requiredPermissions: ["argocd:admin", "argocd:sync", "admin"],
  callback
};
