import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: Trigger ArgoCD application sync via direct API
  // Will initiate sync operation and return status
  // Output: Sync operation result

  return {
    content: [
      {
        type: "text" as const,
        text: "TODO: Sync ArgoCD application",
        mimeType: "text/plain"
      }
    ],
    structuredContent: {
      success: false,
      message: "Not implemented yet"
    }
  };
};

export const syncArgoApplicationTool: ToolDefinition = {
  name: "syncArgoApplication",
  description: "Trigger ArgoCD application sync via direct API",
  inputSchema: z.object({
    applicationName: z.string().describe("Name of the ArgoCD application to sync"),
    dryRun: z.boolean().default(false).describe("Perform a dry-run sync"),
    prune: z.boolean().default(false).describe("Prune resources during sync"),
    force: z.boolean().default(false).describe("Force sync even if no changes"),
    resources: z.array(z.string()).optional().describe("Specific resources to sync")
  }),
  callback
};
