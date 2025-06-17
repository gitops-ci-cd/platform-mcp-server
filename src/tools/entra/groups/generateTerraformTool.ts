import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: Generate Terraform configuration for Entra (Azure AD) group
  // Will create azuread_group and related resources
  // Output: Terraform .tf file content

  return {
    content: [
      {
        type: "text" as const,
        text: "TODO: Generate Entra group Terraform",
        mimeType: "text/plain"
      }
    ],
    structuredContent: {
      success: false,
      message: "Not implemented yet"
    }
  };
};

export const generateEntraGroupTerraformTool: ToolDefinition = {
  name: "generateEntraGroupTerraform",
  description: "Generate Terraform configuration for Entra (Azure AD) group",
  inputSchema: z.object({
    groupName: z.string().describe("Display name of the group"),
    description: z.string().optional().describe("Group description"),
    groupType: z.enum(["security", "office365"]).default("security").describe("Type of group"),
    mailEnabled: z.boolean().default(false).describe("Whether group is mail-enabled"),
    securityEnabled: z.boolean().default(true).describe("Whether group is security-enabled"),
    owners: z.array(z.string()).optional().describe("Group owners (user IDs)")
  }),
  callback
};
