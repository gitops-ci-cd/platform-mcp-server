import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getArtifactoryConfig, readRepository, listRepositories, listRepositoryContents } from "../../../lib/clients/artifactory/index.js";

// Read callback function for individual repository resource template
const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const { repositoryKey } = variables as {
    repositoryKey: string
  };

  // Convert the flattened repository key back to the real path (replace -- with /)
  const realRepositoryPath = repositoryKey.replace(/--/g, "/");
  const pathParts = realRepositoryPath.split("/");
  const baseRepositoryKey = pathParts[0]; // e.g., "docker"

  try {
    const artifactoryConfig = getArtifactoryConfig();

    // Get the base repository info
    const response = await readRepository(baseRepositoryKey);

    const contents = await listRepositoryContents(realRepositoryPath);
    const recentArtifacts = contents.slice(0, 10); // Most recent 10 versions

    return resourceResponse({
      message: `Retrieved Artifactory repository: ${realRepositoryPath}`,
      data: response,
      metadata: {
        name: realRepositoryPath,
        description: response.description || "",
        type: response.rclass,
        packageType: response.packageType,
        recentArtifacts,
        potentialActions: [
          "Browse repository contents via web UI",
          "Upload artifacts via web UI or API",
          "Configure repository settings",
          ...(recentArtifacts.length > 0 ? ["View recent artifacts and versions"] : [])
        ]
      },
      links: {
        ui: `${artifactoryConfig.endpoint.replace("/artifactory/api", "")}/ui/repos/tree/General/${realRepositoryPath}`,
        docs: "https://www.jfrog.com/confluence/display/JFROG/Repository+Management"
      },
    }, uri);
  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Artifactory repository ${realRepositoryPath}: ${error.message}`,
      links: {
        docs: "https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API",
        troubleshooting: "https://www.jfrog.com/confluence/display/JFROG/Troubleshooting+Artifactory"
      },
      metadata: {
        troubleshooting: [
          "Ensure ARTIFACTORY_URL and ARTIFACTORY_API_KEY environment variables are set",
          "Verify your Artifactory API key has repository read permissions",
          `Check that the repository '${realRepositoryPath}' exists and is accessible`,
          "Check Artifactory server connectivity and accessibility"
        ]
      }
    }, uri);
  }
};

// Resource template definition for Artifactory repositories
export const artifactoryRepositoriesTemplate: ResourceTemplateDefinition = {
  title: "Artifactory Repositories",
  resourceTemplate: new ResourceTemplate(
    "artifactory://repositories/{repositoryKey}",
    {
      list: undefined,
      complete: {
        repositoryKey: async (value: string): Promise<string[]> => {
          const response = await listRepositories(value);

          return response
            .map((path: string) => path.replace(/\//g, "--")); // Replace / with -- for URI safety
        }
      }
    }
  ),
  metadata: {
    description: "Access specific Artifactory repositories by key. Provides repository details, statistics, and management actions",
  },
  requiredPermissions: ["artifactory:read", "artifactory:repositories:read", "admin"],
  readCallback,
};
