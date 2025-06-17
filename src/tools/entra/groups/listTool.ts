import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: List and query Entra ID (Azure AD) groups
  // Will fetch groups via Microsoft Graph API with filtering
  // Output: Groups list with member counts, permissions, and direct links

  return {
    content: [
      {
        type: "text" as const,
        text: "TODO: List Entra ID groups - not implemented yet",
        mimeType: "text/plain"
      }
    ],
    structuredContent: {
      success: false,
      message: "Entra ID groups list tool not implemented yet"
    }
  };
};

export const listEntraGroupsTool: ToolDefinition = {
  name: "listEntraGroups",
  description: "List and query Entra ID (Azure AD) groups with filtering and sorting capabilities",
  inputSchema: z.object({
    groupType: z.enum(["security", "distribution", "unified", "all"]).default("all").describe("Filter by group type"),
    namePattern: z.string().optional().describe("Filter by group name pattern (substring match)"),
    membershipType: z.enum(["assigned", "dynamic", "all"]).default("all").describe("Filter by membership type"),
    includeMembers: z.boolean().default(false).describe("Include member count and details"),
    sortBy: z.enum(["name", "created", "memberCount", "lastActivity"]).optional().describe("Sort results by field"),
    limit: z.number().min(1).max(100).optional().describe("Limit number of results (max 100)")
  }),
  callback
};
