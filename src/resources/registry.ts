import {
  McpServer,
  RegisteredResource,
  RegisteredResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";

// Resource definition interface
export interface ResourceDefinition extends Pick<RegisteredResource, "name" | "metadata" | "readCallback"> {
  uri: string;
  // For future authentication/authorization
  requiredPermissions?: string[];
}

// Template definition interface
export interface ResourceTemplateDefinition extends Pick<RegisteredResourceTemplate, "resourceTemplate" | "metadata" | "readCallback"> {
  name: string;
  // For future authentication/authorization
  requiredPermissions?: string[];
}

// Registry to store all available resources
export const resourceRegistry = new Map<string, ResourceDefinition>();
export const templateRegistry = new Map<string, ResourceTemplateDefinition>();

// Register a direct resource in the registry
export function registerResource(resourceDef: ResourceDefinition): void {
  resourceRegistry.set(resourceDef.uri, resourceDef);
}

// Register a resource template in the registry
export function registerResourceTemplate(templateDef: ResourceTemplateDefinition): void {
  templateRegistry.set(templateDef.name, templateDef);
}

// Get resources filtered by permissions (for future auth integration)
export function getAuthorizedResources(userPermissions: string[] = []): ResourceDefinition[] {
  return Array.from(resourceRegistry.values()).filter((resource) => {
    // If no permissions required, resource is available to everyone
    if (!resource.requiredPermissions || resource.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return resource.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
}

// Get templates filtered by permissions (for future auth integration)
export function getAuthorizedTemplates(userPermissions: string[] = []): ResourceTemplateDefinition[] {
  return Array.from(templateRegistry.values()).filter((template) => {
    // If no permissions required, template is available to everyone
    if (!template.requiredPermissions || template.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return template.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
}

// Register resources with an MCP server instance
export function registerResourcesWithServer(
  server: McpServer,
  userPermissions: string[] = []
): void {
  // Filter resources by permissions
  const authorizedResources = getAuthorizedResources(userPermissions);

  // Register direct resources
  for (const resource of authorizedResources) {
    const { name, uri, metadata, readCallback } = resource;
    server.resource(
      name,
      uri,
      metadata || {},
      readCallback
    );
  }
}

// Register resource templates with an MCP server instance
export function registerResourceTemplatesWithServer(
  server: McpServer,
  userPermissions: string[] = []
): void {
  // Filter templates by permissions
  const authorizedTemplates = getAuthorizedTemplates(userPermissions);

  // Register resource templates
  for (const template of authorizedTemplates) {
    const { name, resourceTemplate, metadata, readCallback } = template;
    server.resource(
      name,
      resourceTemplate,
      metadata || {},
      readCallback,
    );
  }
}
