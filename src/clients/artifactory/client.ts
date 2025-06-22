// JFrog Artifactory API client utilities
import type { ArtifactoryConfig } from "./types.js";

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
