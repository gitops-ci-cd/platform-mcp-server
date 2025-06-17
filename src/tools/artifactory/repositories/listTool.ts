import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: List and query Artifactory repositories
  // Will fetch repositories via Artifactory API with filtering
  // Output: Repository list with type, size, usage stats, and direct links

  const errorData = {
    error: "Artifactory repositories list tool not implemented yet",
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

export const listArtifactoryRepositoriesTool: ToolDefinition = {
  name: "listArtifactoryRepositories",
  description: "List and query Artifactory repositories with filtering and sorting capabilities",
  inputSchema: z.object({
    repoType: z.enum(["local", "remote", "virtual", "all"]).default("all").describe("Filter by repository type"),
    packageType: z.string().optional().describe("Filter by package type (maven, npm, docker, etc.)"),
    namePattern: z.string().optional().describe("Filter by repository name pattern (substring match)"),
    includeStats: z.boolean().default(false).describe("Include storage statistics and usage info"),
    sortBy: z.enum(["name", "type", "size", "lastActivity"]).optional().describe("Sort results by field"),
    limit: z.number().min(1).max(100).optional().describe("Limit number of results (max 100)")
  }),
  callback
};
