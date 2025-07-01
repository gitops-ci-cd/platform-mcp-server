// JFrog Artifactory configuration utilities
import type { ArtifactoryConfig } from "./types.js";

/**
 * Load Artifactory configuration from environment variables
 * @returns Artifactory configuration object
 * @throws Error if required environment variables are missing
 */
export const getArtifactoryConfig = (): ArtifactoryConfig => {
  const endpoint = process.env.ARTIFACTORY_URL || "";
  const apiKey = process.env.ARTIFACTORY_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("ARTIFACTORY_URL and ARTIFACTORY_API_KEY environment variables are required");
  }

  return { endpoint, apiKey };
};
