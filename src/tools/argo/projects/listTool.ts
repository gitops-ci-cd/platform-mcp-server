import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: List and query ArgoCD projects with filtering capabilities
  // Will query projects via ArgoCD API and return summaries with direct links
  // Output: Project list with status, applications count, and action links

  const errorData = {
    error: "ArgoCD projects list tool not implemented yet",
    status: "not_implemented"
  };

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(errorData, null, 2),
        mimeType: "application/json"
      }
    ],
    structuredContent: errorData,
    isError: true
  };
};

export const listArgoProjectsTool: ToolDefinition = {
  name: "listArgoProjects",
  description: "List and query ArgoCD projects with filtering and sorting capabilities",
  inputSchema: z.object({
    namePattern: z.string().optional().describe("Filter by project name pattern (substring match)"),
    includeApplications: z.boolean().default(false).describe("Include applications count and status for each project"),
    sortBy: z.enum(["name", "created", "application-count"]).optional().describe("Sort results by field"),
    limit: z.number().min(1).max(100).optional().describe("Limit number of results (max 100)")
  }),
  callback
};
