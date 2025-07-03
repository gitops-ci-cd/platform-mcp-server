// JFrog Artifactory API client utilities
import type { ArtifactoryConfig } from "./types.js";
import { getArtifactoryConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * Make authenticated HTTP requests to the JFrog Artifactory REST API
 * Handles authentication using API key and provides consistent error handling across all API calls.
 *
 * This is the core HTTP client function used by all other Artifactory client functions.
 * It automatically:
 * - Constructs the full API URL with the /artifactory/api/ prefix
 * - Adds proper authentication headers using the API key
 * - Handles JSON serialization/deserialization
 * - Provides meaningful error messages with HTTP status codes
 * - Handles empty responses (HTTP 204 No Content)
 *
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path API path relative to /artifactory/api/ (e.g., "repositories", "storage/repo-key/path")
 * @param config Artifactory configuration containing endpoint and API key
 * @param data Optional request body data (will be JSON serialized)
 * @returns Promise with parsed JSON response, or empty object for 204 responses
 * @throws Error if API request fails with descriptive error message including status code
 */
export const artifactoryApiRequest = async ({ method, path, config, data }: {
  method: string,
  path: string,
  config: ArtifactoryConfig,
  data?: any
}): Promise<any> => {
  const url = `${config.endpoint}/artifactory/api/${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-JFrog-Art-Api": config.apiKey,
  };

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Artifactory API error (${response.status}): ${errorText}`);
  }

  // Some operations return no content
  if (response.status === 204) {
    return {};
  }

  return await response.json();
};

/**
 * Apply package-type-specific default configuration properties to repository settings
 * Each package type in Artifactory has different configuration options and recommended defaults.
 * This function ensures that repositories are created with sensible defaults while allowing
 * user-provided properties to override any defaults.
 *
 * Supported package types and their defaults:
 * - docker: dockerApiVersion=V2, maxUniqueTags=0 (unlimited)
 * - npm: bower=false
 * - maven: handleReleases=true, handleSnapshots=true, suppressPomConsistencyChecks=false
 * - generic: minimal configuration (no specific defaults)
 *
 * @param packageType The package type (docker, maven, npm, gradle, generic, etc.)
 * @param properties User-provided repository properties (will override defaults)
 * @returns Merged configuration object with package-specific defaults and user overrides
 */
export const applyPackageTypeDefaults = ({ packageType, properties = {} }: {
  packageType: string,
  properties?: Record<string, any>
}): Record<string, any> => {
  const defaults: Record<string, any> = {};

  switch (packageType.toLowerCase()) {
    case "docker":
      defaults.dockerApiVersion = properties.dockerApiVersion || "V2";
      defaults.maxUniqueTags = properties.maxUniqueTags || 0;
      break;
    case "npm":
      defaults.bower = properties.bower || false;
      break;
    case "maven":
      defaults.handleReleases = properties.handleReleases !== false;
      defaults.handleSnapshots = properties.handleSnapshots !== false;
      defaults.suppressPomConsistencyChecks = properties.suppressPomConsistencyChecks || false;
      break;
    case "generic":
      // Generic repositories have minimal configuration
      break;
  }

  return { ...defaults, ...properties };
};

/**
 * Fetch all available repositories and Docker service paths from Artifactory
 * This function builds a comprehensive list including repository keys and Docker service paths
 * to enable efficient auto-completion and resource browsing in MCP clients.
 *
 * For Docker repositories, it specifically looks for services under predefined folder hierarchies
 * (engineering, devops, legalzoom, data-engineering, data-sciences) to provide meaningful
 * completion paths like "docker/engineering/authorization-service".
 *
 * @param name Optional repository name filter (currently unused but kept for compatibility)
 * @returns Array of repository keys and Docker service paths, cached for 30 minutes
 */
export const listRepositories = async (name?: string): Promise<string[]> => {
  const cacheKey = "artifactory-repositories";
  const cache = checkCache({ cacheKey, value: name });
  if (cache.length > 0) return cache;

  try {
    const config = getArtifactoryConfig();
    const response = await artifactoryApiRequest({
      method: "GET",
      path: "repositories",
      config
    });

    if (!Array.isArray(response)) {
      throw new Error("No repositories data returned from Artifactory");
    }

    let allPaths: string[] = [];

    // Get basic repository keys
    const repositoryKeys = response.map((repo: any) => repo.key).sort();
    allPaths.push(...repositoryKeys);

    // For Docker repositories, also get service paths for specific folders we care about
    const dockerRepos = response.filter((repo: any) =>
      repo.packageType === "docker" || repo.key.includes("docker")
    );

    // Hardcoded folders we care about under docker repositories
    const targetFolders = ["engineering", "devops", "legalzoom", "data-engineering", "data-sciences"];

    for (const dockerRepo of dockerRepos) {
      // Add the folder paths first
      targetFolders.forEach(folder => {
        allPaths.push(`${dockerRepo.key}/${folder}`);
      });

      // Then get services within each target folder
      for (const folder of targetFolders) {
        // Get services within each folder
        const services = await listRepositoryContents(`${dockerRepo.key}/${folder}`);

        services.forEach((service: string) => {
          allPaths.push(`${dockerRepo.key}/${folder}/${service}`);
        });
      }
    }

    // Remove duplicates and sort
    const uniquePaths = [...new Set(allPaths)].sort();

    // Cache the results for 30 minutes (30 * 60 * 1000 ms)
    return resourceCache.set(cacheKey, uniquePaths, 30 * 60 * 1000);
  } catch {
    console.warn("Could not fetch repositories");
  }

  return [];
};

/**
 * Retrieve detailed configuration for a specific repository
 * Returns the complete repository configuration including package type, description,
 * storage properties, and all package-specific settings.
 *
 * This is useful for verifying repository existence, understanding current configuration,
 * or preparing repository updates.
 *
 * @param repositoryKey The unique repository identifier (e.g., "docker-local", "maven-central")
 * @returns Repository configuration object with all settings
 * @throws Error if repository doesn't exist or API request fails
 */
export const readRepository = async (repositoryKey: string): Promise<any> => {
  const config = getArtifactoryConfig();
  const response = await artifactoryApiRequest({
    method: "GET",
    path: `repositories/${repositoryKey}`,
    config
  });

  return response;
};

/**
 * Create a new repository in Artifactory with the provided configuration
 * This operation is idempotent - if the repository already exists with the same configuration,
 * it will not be modified. If it exists with different configuration, the request may fail.
 *
 * The repository configuration should include:
 * - key: unique repository identifier
 * - rclass: repository class (local, remote, virtual, federated)
 * - packageType: package type (maven, docker, npm, gradle, etc.)
 * - description: human-readable description
 * - Additional package-specific properties as needed
 *
 * @param data Complete repository configuration object
 * @returns Empty object on success (HTTP 204 No Content)
 * @throws Error if repository creation fails or configuration is invalid
 */
export const createRepository = async (data: any): Promise<any> => {
  const config = getArtifactoryConfig();
  const response = await artifactoryApiRequest({
    method: "PUT",
    path: `repositories/${data.key}`,
    config,
    data
  });

  return response;
};

/**
 * Get storage information for a specific repository path or artifact
 * This provides detailed metadata about files, folders, and artifacts stored in Artifactory,
 * including file sizes, checksums, creation/modification times, and child items.
 *
 * For folders, returns a list of child items with their metadata.
 * For files, returns detailed artifact information including checksums and properties.
 *
 * Common use cases:
 * - Browse repository contents
 * - Get artifact metadata
 * - List available versions/tags for Docker images
 * - Check file existence and properties
 *
 * @param repositoryPath Full path within Artifactory (e.g., "docker/engineering/my-service", "maven-local/com/example/my-artifact")
 * @returns Storage information object with metadata and optional children array
 * @throws Error if path doesn't exist or access is denied
 */
export const readRepositoryStorage = async (repositoryPath: string): Promise<any> => {
  const config = getArtifactoryConfig();
  const response = await artifactoryApiRequest({
    method: "GET",
    path: `storage/${repositoryPath}`,
    config
  });

  return response;
};

/**
 * List the immediate child items (files and folders) within a repository path
 * This is a convenience wrapper around readRepositoryStorage that extracts just the
 * child item names, making it easy to browse repository contents programmatically.
 *
 * Returns only the names of direct children, not their full metadata.
 * Useful for building file trees, auto-completion, or navigation interfaces.
 *
 * @param repositoryPath Full path within Artifactory to list contents for
 * @returns Array of child item names (files and folders), empty array if path has no children or doesn't exist
 */
export const listRepositoryContents = async (repositoryPath: string): Promise<string[]> => {
  try {
    const storageInfo = await readRepositoryStorage(repositoryPath);

    if (storageInfo?.children && Array.isArray(storageInfo.children)) {
      return storageInfo.children
        .sort((a: any, b: any) => new Date(b.lastModified || 0).getTime() - new Date(a.lastModified || 0).getTime())
        .map((child: any) => child.uri.replace("/", ""));
    }

    return [];
  } catch {
    return [];
  }
};
