// JFrog Artifactory API client utilities
import type { ArtifactoryConfig } from "./types.js";
import { getArtifactoryConfig } from "./config.js";
import { resourceCache, checkCache } from "../../cache.js";

/**
 * Make HTTP request to Artifactory API with proper authentication
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path API path (without /artifactory/api/ prefix)
 * @param config Artifactory configuration
 * @param data Optional request body data
 * @returns Promise with API response
 * @throws Error if API request fails
 */
export const artifactoryApiRequest = async (
  method: string,
  path: string,
  config: ArtifactoryConfig,
  data?: any
): Promise<any> => {
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
 * Apply default properties based on package type
 * @param packageType The package type
 * @param properties User-provided properties
 * @returns Merged configuration with defaults
 */
export const applyPackageTypeDefaults = (
  packageType: string,
  properties: Record<string, any> = {}
): Record<string, any> => {
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

export const listRepositories = async (name?: string): Promise<string[]> => {
  try {
    const cacheKey = "artifactory-repositories";
    const cache = checkCache({ cacheKey, value: name });
    if (cache.length > 0) return cache;

    const config = getArtifactoryConfig();
    const response = await artifactoryApiRequest(
      "GET",
      "repositories",
      config
    );

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
        try {
          // Get services within each folder
          const folderResponse = await artifactoryApiRequest(
            "GET",
            `storage/${dockerRepo.key}/${folder}`,
            config
          );

          if (folderResponse?.children && Array.isArray(folderResponse.children)) {
            const services = folderResponse.children
              .filter((child: any) => child.folder)
              .map((child: any) => child.uri.replace("/", ""));

            // Add service paths like "docker/engineering/authorization-service"
            services.forEach((service: string) => {
              allPaths.push(`${dockerRepo.key}/${folder}/${service}`);
            });
          }
        } catch {
          // If we can't access this folder, that's ok, we already added the folder path
        }
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

export const readRepository = async (repositoryKey: string): Promise<any> => {
  const config = getArtifactoryConfig();
  const response = await artifactoryApiRequest(
    "GET",
    `repositories/${repositoryKey}`,
    config
  );

  return response;
};
