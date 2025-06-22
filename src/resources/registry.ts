import {
  McpServer,
  RegisteredResource,
  RegisteredResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

// Resource definition interface
export interface ResourceDefinition extends Pick<RegisteredResource, "title" | "metadata" | "readCallback"> {
  uri: string;
  requiredPermissions?: string[];
}

// Template definition interface
export interface ResourceTemplateDefinition extends Pick<RegisteredResourceTemplate, "resourceTemplate" | "title" | "metadata" | "readCallback"> {
  requiredPermissions?: string[];
}

// Registry to store all available resources
export const resourceRegistry = new Map<string, ResourceDefinition>();
export const templateRegistry = new Map<string, ResourceTemplateDefinition>();

// Register a direct resource in the registry
export const registerResource = (resourceDef: ResourceDefinition): void => {
  resourceRegistry.set(resourceDef.uri, resourceDef);
};

// Register a resource template in the registry
export const registerResourceTemplate = (templateDef: ResourceTemplateDefinition): void => {
  templateRegistry.set(titleToName(templateDef.title), templateDef);
};

// Get resources filtered by permissions
export const getAuthorizedResources = (userPermissions: string[] = []): ResourceDefinition[] => {
  return Array.from(resourceRegistry.values()).filter((resource) => {
    // If no permissions required, resource is available to everyone
    if (!resource.requiredPermissions || resource.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return resource.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
};

// Get templates filtered by permissions
export const getAuthorizedTemplates = (userPermissions: string[] = []): ResourceTemplateDefinition[] => {
  return Array.from(templateRegistry.values()).filter((template) => {
    // If no permissions required, template is available to everyone
    if (!template.requiredPermissions || template.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return template.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
};

// Register resources with an MCP server instance
export const registerResourcesWithServer = (
  server: McpServer,
  userPermissions: string[] = []
): void => {
  // Filter resources by permissions
  const authorizedResources = getAuthorizedResources(userPermissions);

  // Register direct resources
  for (const resource of authorizedResources) {
    const { title, uri, metadata, readCallback } = resource;
    server.resource(
      titleToName(title),
      uri,
      metadata || {},
      readCallback
    );
  }
};

// Register resource templates with an MCP server instance
export const registerResourceTemplatesWithServer = (
  server: McpServer,
  userPermissions: string[] = []
): void => {
  // Filter templates by permissions
  const authorizedTemplates = getAuthorizedTemplates(userPermissions);

  // Register resource templates
  for (const template of authorizedTemplates) {
    const { title, resourceTemplate, metadata, readCallback } = template;
    server.resource(
      titleToName(title),
      resourceTemplate,
      metadata || {},
      readCallback,
    );
  }
};

// Helper function to convert title to a valid tool name
const titleToName = (title: string = "Unknown"): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
};
