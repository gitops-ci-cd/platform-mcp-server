// JFrog Artifactory type definitions

export interface ArtifactoryConfig {
  endpoint: string;
  apiKey: string;
}

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
