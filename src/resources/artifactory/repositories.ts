import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";
import { getArtifactoryConfig, readRepository, listRepositories, artifactoryApiRequest } from "../../../lib/clients/artifactory/index.js";

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
    const repository = await readRepository(baseRepositoryKey);

    const artifactoryWebUrl = artifactoryConfig.endpoint.replace("/artifactory/api", "");
    const repoWebUrl = `${artifactoryWebUrl}/ui/repos/tree/General/${realRepositoryPath}`;

    // Get recent artifacts/versions for this repository or service path
    let recentArtifacts = [];
    try {
      // This is a specific service path like "docker/engineering/authorization-service"
      const storageResponse = await artifactoryApiRequest(
        "GET",
        `storage/${realRepositoryPath}`,
        artifactoryConfig
      );

      if (storageResponse?.children && Array.isArray(storageResponse.children)) {
        // Get recent versions/tags for this specific service
        const versions = storageResponse.children
          .filter((child: any) => child.folder)
          .sort((a: any, b: any) => new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime())
          .slice(0, 10); // Most recent 10 versions

        recentArtifacts = versions.map((v: any) => v.uri.replace("/", ""));
      }
    } catch {
      // If we can't get artifacts, that's ok
    }

    return resourceResponse({
      message: `Retrieved Artifactory repository: ${realRepositoryPath}`,
      data: repository,
      metadata: {
        name: realRepositoryPath,
        description: repository.description || "",
        type: repository.rclass,
        packageType: repository.packageType,
        recentArtifacts,
        potentialActions: [
          "Browse repository contents via web UI",
          "Upload artifacts via web UI or API",
          "Configure repository settings",
          ...(recentArtifacts.length > 0 ? ["View recent artifacts and versions"] : [])
        ]
      },
      links: {
        ui: repoWebUrl,
        artifacts: `${artifactoryWebUrl}/ui/repos/tree/General/${realRepositoryPath}`,
        settings: `${artifactoryWebUrl}/ui/admin/repositories/${repository.rclass?.toLowerCase() || "local"}/${baseRepositoryKey}`,
        api: `${artifactoryConfig.endpoint}/repositories/${baseRepositoryKey}`,
        storage: `${artifactoryConfig.endpoint}/storage/${realRepositoryPath}`,
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
