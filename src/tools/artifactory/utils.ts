// Common utilities for JFrog Artifactory API interactions

export interface ArtifactoryConfig {
  endpoint: string;
  username: string;
  password: string; // Or API key
}

/**
 * Load Artifactory configuration from environment variables
 * @returns Artifactory configuration object
 * @throws Error if required environment variables are missing
 */
export const getArtifactoryConfig = (): ArtifactoryConfig => {
  const endpoint = process.env.ARTIFACTORY_URL || "https://artifactory.legalzoom.com";
  const username = process.env.ARTIFACTORY_USERNAME;
  const password = process.env.ARTIFACTORY_PASSWORD || process.env.ARTIFACTORY_API_KEY;

  if (!username || !password) {
    throw new Error("ARTIFACTORY_USERNAME and ARTIFACTORY_PASSWORD (or ARTIFACTORY_API_KEY) environment variables are required");
  }

  return { endpoint, username, password };
};

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
    "Authorization": `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`,
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
    return { success: true };
  }

  return await response.json();
};

/**
 * Common Artifactory package types supported by the API
 */
export const ARTIFACTORY_PACKAGE_TYPES = [
  "maven",
  "docker",
  "npm",
  "gradle",
  "nuget",
  "pypi",
  "debian",
  "rpm",
  "helm",
  "generic",
  "go",
  "composer",
  "conan",
  "chef",
  "puppet",
  "bower",
  "gitlfs",
  "opkg",
  "cargo",
  "cocoapods",
] as const;

export type ArtifactoryPackageType = typeof ARTIFACTORY_PACKAGE_TYPES[number];

/**
 * Common Artifactory repository types
 */
export const ARTIFACTORY_REPOSITORY_TYPES = [
  "local",
  "remote",
  "virtual",
  "federated"
] as const;

export type ArtifactoryRepositoryType = typeof ARTIFACTORY_REPOSITORY_TYPES[number];

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
