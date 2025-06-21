import { z } from "zod";
import { ToolDefinition } from "../../registry.js";
import { getCurrentUser } from "../../../auth/index.js";
import {
  getArtifactoryConfig,
  artifactoryApiRequest,
  applyPackageTypeDefaults,
  ARTIFACTORY_PACKAGE_TYPES,
  ARTIFACTORY_REPOSITORY_TYPES,
} from "../../../clients/artifactory/index.js";

const inputSchema = z.object({
  repositoryKey: z.string().describe("Unique repository key/name (e.g., 'docker-local', 'maven-central')"),
  packageType: z.enum(ARTIFACTORY_PACKAGE_TYPES).describe("Package type for the repository"),
  repositoryType: z.enum(ARTIFACTORY_REPOSITORY_TYPES).describe("Repository type (local, remote, virtual, or federated)"),
  description: z.string().optional().describe("Human-readable description of the repository"),
  properties: z.record(z.any()).optional().describe("Repository-specific configuration properties (e.g., dockerApiVersion, handleReleases)")
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  try {
    const { repositoryKey, packageType, repositoryType, description, properties } = args as {
      repositoryKey: string;
      packageType: string;
      repositoryType: string;
      description?: string;
      properties?: Record<string, any>;
    };

    // Get authenticated user for audit logging
    const user = getCurrentUser(`creating Artifactory repository: ${repositoryKey}`);

    // Load Artifactory configuration
    const artifactoryConfig = getArtifactoryConfig();

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
    if (properties) {
      Object.assign(repoConfig, applyPackageTypeDefaults(packageType, properties));
    } else {
      Object.assign(repoConfig, applyPackageTypeDefaults(packageType));
    }

    // Create the repository
    await artifactoryApiRequest(
      "PUT",
      `repositories/${repositoryKey}`,
      artifactoryConfig,
      repoConfig
    );

    // Get the repository details to return comprehensive info
    const repoInfo = await artifactoryApiRequest(
      "GET",
      `repositories/${repositoryKey}`,
      artifactoryConfig
    );

    const successData = {
      success: true,
      repository: {
        key: repositoryKey,
        type: repositoryType,
        packageType,
        description: description || "",
        url: `${artifactoryConfig.endpoint}/ui/repos/tree/General/${repositoryKey}`,
        config: repoInfo,
      },
      artifactory_endpoint: artifactoryConfig.endpoint,
      created_by: user.email,
      created_at: new Date().toISOString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(successData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: successData,
    };

  } catch (error: any) {
    const errorData = {
      error: `Failed to create Artifactory repository: ${error.message}`,
      status: "error",
      details: error.stack || error.toString(),
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(errorData, null, 2),
          mimeType: "application/json"
        }
      ],
      structuredContent: errorData,
      isError: true
    };
  }
};

export const createArtifactoryRepositoryTool: ToolDefinition = {
  name: "createArtifactoryRepository",
  description: "Create a new repository in JFrog Artifactory via direct API call. Supports Docker, Maven, NPM, Gradle, and other package types.",
  inputSchema,
  requiredPermissions: ["artifactory:admin", "artifactory:repos:create", "admin"],
  callback
};
