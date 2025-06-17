import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: Generate Terraform configuration to delete Artifactory repository
  // Will remove repository resource from Terraform state
  // Output: Terraform destroy commands/configuration

  return {
    content: [
      {
        type: "text" as const,
        text: "TODO: Delete Artifactory repository Terraform",
        mimeType: "text/plain"
      }
    ],
    structuredContent: {
      success: false,
      message: "Not implemented yet"
    }
  };
};

export const removeArtifactoryRepositoryTerraformTool: ToolDefinition = {
  name: "removeArtifactoryRepositoryTerraform",
  description: "Generate Terraform configuration to delete Artifactory repository",
  inputSchema: z.object({
    repositoryKey: z.string().describe("Repository key/name to delete"),
    forceDelete: z.boolean().default(false).describe("Force deletion even if repository contains artifacts")
  }),
  callback
};
