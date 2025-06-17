import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: Generate Terraform configuration to delete Entra group
  // Will remove group resource from Terraform state
  // Output: Terraform destroy commands/configuration

  return {
    content: [
      {
        type: "text" as const,
        text: "TODO: Delete Entra group Terraform",
        mimeType: "text/plain"
      }
    ],
    structuredContent: {
      success: false,
      message: "Not implemented yet"
    }
  };
};

export const removeEntraGroupTerraformTool: ToolDefinition = {
  name: "removeEntraGroupTerraform",
  description: "Generate Terraform configuration to delete Entra (Azure AD) group",
  inputSchema: z.object({
    groupName: z.string().describe("Display name of the group to delete"),
    forceDelete: z.boolean().default(false).describe("Force deletion even if group has members")
  }),
  callback
};
