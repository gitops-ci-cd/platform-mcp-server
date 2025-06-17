import { z } from "zod";
import { ToolDefinition } from "../../registry.js";

const callback: ToolDefinition["callback"] = async (_args, _extra) => {
  // TODO: Remove Terraform configuration for Artifactory repository
  // Will remove artifactory repository resources
  // Output: Terraform removal operations result

  const errorData = {
    error: "Artifactory repositories Terraform removal tool not implemented yet",
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

export const removeArtifactoryRepositoryTerraformTool: ToolDefinition = {
  name: "removeArtifactoryRepositoryTerraform",
  description: "Remove Terraform configuration for Artifactory repository",
  inputSchema: z.object({
    repositoryKey: z.string().describe("Repository key/name to delete"),
    forceDelete: z.boolean().default(false).describe("Force deletion even if repository contains artifacts")
  }),
  callback
};
