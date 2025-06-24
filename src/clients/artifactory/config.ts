// JFrog Artifactory configuration utilities
import type { ArtifactoryConfig } from "./types.js";

/**
 * Load Artifactory configuration from environment variables
 * @returns Artifactory configuration object
 * @throws Error if required environment variables are missing
 */
export const getArtifactoryConfig = (): ArtifactoryConfig => {
  const endpoint = process.env.ARTIFACTORY_URL || "";
  const username = process.env.ARTIFACTORY_USERNAME;
  const password = process.env.ARTIFACTORY_PASSWORD || process.env.ARTIFACTORY_API_KEY;

  if (!username || !password) {
    throw new Error("ARTIFACTORY_USERNAME and ARTIFACTORY_PASSWORD (or ARTIFACTORY_API_KEY) environment variables are required");
  }

  return { endpoint, username, password };
};
