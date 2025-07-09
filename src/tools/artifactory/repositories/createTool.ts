import { z } from "zod";

import { ToolDefinition, toolResponse } from "../../registry.js";
import { getCurrentUser } from "../../../../lib/auth/index.js";
import {
  getArtifactoryConfig,
  applyPackageTypeDefaults,
  readRepository,
  createRepository,
  ARTIFACTORY_PACKAGE_TYPES,
  ARTIFACTORY_REPOSITORY_TYPES,
} from "../../../../lib/clients/artifactory/index.js";

const inputSchema = z.object({
  repositoryKey: z.string().describe("Unique repository key/name (e.g., 'docker-local', 'maven-central')"),
  packageType: z.enum(ARTIFACTORY_PACKAGE_TYPES).describe("Package type for the repository"),
  repositoryType: z.enum(ARTIFACTORY_REPOSITORY_TYPES).describe("Repository type (local, remote, virtual, or federated)"),
  description: z.string().optional().describe("Human-readable description of the repository"),
  properties: z.record(z.any()).optional().describe("Repository-specific configuration properties (e.g., dockerApiVersion, handleReleases)")
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { repositoryKey, packageType, repositoryType, description, properties } = args as {
    repositoryKey: string;
    packageType: string;
    repositoryType: string;
    description?: string;
    properties?: Record<string, any>;
  };

  try {
    // Get authenticated user for audit logging
    getCurrentUser(`creating Artifactory repository: ${repositoryKey}`);

    // Load Artifactory configuration
    const artifactoryConfig = getArtifactoryConfig();
    const artifactoryWebUrl = artifactoryConfig.endpoint.replace("/artifactory/api", "");

    // Prepare repository configuration based on type
    const repoConfig: any = {
      key: repositoryKey,
      packageType,
      rclass: repositoryType,
    };

    if (description) {
      repoConfig.description = description;
    }

    // Add type-specific properties
    Object.assign(repoConfig, applyPackageTypeDefaults({ packageType, properties }));

    let data = null;
    let message = "";
    let action = "";

    try {
      // Check if repository already exists using the helper
      const existingRepo = await readRepository(repositoryKey);
      data = existingRepo;
      message = `Artifactory repository "${repositoryKey}" already exists and is ready to use`;
      action = "verified";
    } catch (checkError: any) {
      // Repository doesn't exist, create it
      if (!checkError.message.includes("404") && !checkError.message.includes("not found")) {
        throw checkError; // Re-throw if it's not a "not found" error
      }

      // Create the repository
      await createRepository(repoConfig);

      // Get the repository details to return comprehensive info
      const repoInfo = await readRepository(repositoryKey);
      data = repoInfo;
      message = `Artifactory repository "${repositoryKey}" created successfully`;
      action = "created";
    }

    return toolResponse({
      data,
      message,
      metadata: {
        repository_key: repositoryKey,
        package_type: packageType,
        repository_type: repositoryType,
        description: description || "",
        action
      },
      links: {
        ui: `${artifactoryWebUrl}/ui/repos/tree/General/${repositoryKey}`,
        browse: `${artifactoryWebUrl}/ui/repos/tree/General/${repositoryKey}`,
        settings: `${artifactoryWebUrl}/ui/admin/repositories/${repositoryType.toLowerCase()}/${repositoryKey}`,
        api: `${artifactoryConfig.endpoint}/repositories/${repositoryKey}`,
        endpoint: artifactoryConfig.endpoint
      }
    });

  } catch (error: any) {
    return toolResponse({
      message: `Failed to create Artifactory repository: ${error.message}`,
      links: {
        docs: "https://jfrog.com/help/r/jfrog-artifactory-documentation",
        troubleshooting: "https://jfrog.com/help/r/jfrog-artifactory-documentation/troubleshooting"
      },
      metadata: {
        repository_key: repositoryKey,
        troubleshooting: [
          "Check that the repository key is unique",
          "Verify Artifactory server connectivity",
          "Ensure you have admin permissions",
          "Review package type and repository type compatibility"
        ]
      }
    }, true);
  }
};

export const createArtifactoryRepositoryTool: ToolDefinition = {
  title: "Create Artifactory Repository",
  annotations: {
    openWorldHint: true,
    idempotentHint: true,
  },
  description: "Create or verify a new repository in JFrog Artifactory via direct API call. Supports Docker, Maven, NPM, Gradle, and other package types.",
  inputSchema,
  requiredPermissions: ["artifactory:admin", "artifactory:repos:create", "admin"],
  callback
};
