import { ResourceDefinition, resourceResponse } from "../registry.js";
import { getArtifactoryConfig, artifactoryApiRequest } from "../../clients/artifactory/index.js";

// Interface for filtering and sorting options
interface RepositoryOptions {
  repoType?: string;
  packageType?: string;
  namePattern?: string;
  includeStats?: boolean;
  sortBy?: string;
  limit?: number;
}

// Function to fetch and process repositories with filtering and sorting
export async function getArtifactoryRepositories(options: RepositoryOptions = {}) {
  const { repoType, packageType, namePattern, includeStats, sortBy, limit } = options;

  // Load Artifactory configuration
  const artifactoryConfig = getArtifactoryConfig();

  // List all repositories
  const repositoriesResponse = await artifactoryApiRequest(
    "GET",
    "repositories",
    artifactoryConfig
  );

  if (!Array.isArray(repositoriesResponse)) {
    throw new Error("No repositories data returned from Artifactory");
  }

  const artifactoryWebUrl = artifactoryConfig.endpoint.replace("/artifactory/api", "");

  // Filter repositories based on criteria
  let repositories = repositoriesResponse.filter((repo: any) => {
    if (repoType && repoType !== "all" && repo.type !== repoType) return false;
    if (packageType && repo.packageType !== packageType) return false;
    if (namePattern && !repo.key.includes(namePattern)) return false;
    return true;
  });

  // Transform repository data
  let repoList = await Promise.all(repositories.map(async (repo: any) => {
    const repoKey = repo.key;
    const repoWebUrl = `${artifactoryWebUrl}/ui/repos/tree/General/${repoKey}`;

    let basicRepo: any = {
      key: repoKey,
      type: repo.type,
      packageType: repo.packageType,
      description: repo.description || "",
      url: repo.url,
      local: repo.local || false,
      actions: {
        browse: repoWebUrl,
        artifacts: `${artifactoryWebUrl}/ui/repos/tree/General/${repoKey}`,
        settings: `${artifactoryWebUrl}/ui/admin/repositories/${repo.type.toLowerCase()}/${repoKey}`,
        upload: `${artifactoryWebUrl}/ui/repos/tree/General/${repoKey}?action=upload`,
      },
      management_info: {
        web_ui: repoWebUrl,
        api_path: `${artifactoryConfig.endpoint}/repositories/${repoKey}`,
        storage_path: `${artifactoryConfig.endpoint}/storage/${repoKey}`,
        type: repo.type,
        created_at: repo.created,
      }
    };

    if (includeStats) {
      try {
        // Get repository statistics if requested
        const statsResponse = await artifactoryApiRequest(
          "GET",
          `storage/${repoKey}?stats`,
          artifactoryConfig
        );

        basicRepo.stats = {
          size: statsResponse?.size || "0",
          files: statsResponse?.filesCount || 0,
          folders: statsResponse?.foldersCount || 0,
          lastModified: statsResponse?.lastModified,
          lastUpdated: statsResponse?.lastUpdated,
        };
      } catch {
        // If stats fail, continue without them
        basicRepo.stats = { error: "Unable to fetch statistics" };
      }
    }

    return basicRepo;
  }));

  // Apply sorting
  if (sortBy) {
    repoList.sort((a: any, b: any) => {
      switch (sortBy) {
        case "name":
          return a.key.localeCompare(b.key);
        case "type":
          return a.type.localeCompare(b.type);
        case "size":
          if (a.stats?.size && b.stats?.size) {
            return parseInt(a.stats.size) - parseInt(b.stats.size);
          }
          return 0;
        case "lastActivity":
          if (a.stats?.lastModified && b.stats?.lastModified) {
            return new Date(a.stats.lastModified).getTime() - new Date(b.stats.lastModified).getTime();
          }
          return 0;
        default:
          return 0;
      }
    });
  }

  // Apply limit
  if (limit && limit > 0) {
    repoList = repoList.slice(0, limit);
  }

  return {
    repositories: repoList,
    summary: {
      total_count: repoList.length,
      by_type: repoList.reduce((acc: any, repo: any) => {
        acc[repo.type] = (acc[repo.type] || 0) + 1;
        return acc;
      }, {}),
      by_package_type: repoList.reduce((acc: any, repo: any) => {
        acc[repo.packageType] = (acc[repo.packageType] || 0) + 1;
        return acc;
      }, {}),
      local_repositories: repoList.filter((r: any) => r.type === "local").length,
      remote_repositories: repoList.filter((r: any) => r.type === "remote").length,
      virtual_repositories: repoList.filter((r: any) => r.type === "virtual").length,
    },
    artifactory_info: {
      endpoint: artifactoryConfig.endpoint,
      web_ui: artifactoryWebUrl,
      docs: "https://www.jfrog.com/confluence/display/JFROG/Repository+Management",
    },
  };
}

// Read callback function for Artifactory repositories resource
const readCallback: ResourceDefinition["readCallback"] = async (uri) => {
  try {
    // Use the shared function with default options (no filtering)
    const resourceData = await getArtifactoryRepositories();

    return resourceResponse({
      message: "Successfully retrieved Artifactory repositories",
      data: resourceData,
      metadata: {
        totalCount: resourceData.repositories.length,
        byType: resourceData.summary.by_type,
        byPackageType: resourceData.summary.by_package_type,
      },
      links: {
        "Artifactory Web UI": resourceData.artifactory_info.web_ui,
        "Repository Management Documentation": "https://www.jfrog.com/confluence/display/JFROG/Repository+Management",
        "Artifactory REST API": "https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API",
      }
    }, uri);

  } catch (error: any) {
    return resourceResponse({
      message: `Failed to read Artifactory repositories: ${error.message}`,
      metadata: {
        troubleshooting: [
          "Ensure ARTIFACTORY_URL and ARTIFACTORY_TOKEN environment variables are set",
          "Verify your Artifactory token has repository read permissions",
        ],
      },
      links: {
        "Artifactory REST API Documentation": "https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API",
      }
    }, uri);
  }
};

// Resource definition for Artifactory repositories
export const artifactoryRepositoriesResource: ResourceDefinition = {
  uri: "artifactory://repositories",
  title: "Artifactory Repositories",
  metadata: {
    description: "List of all Artifactory repositories with management links and storage details",
  },
  requiredPermissions: ["artifactory:read", "artifactory:repositories:list", "admin"],
  readCallback,
};
