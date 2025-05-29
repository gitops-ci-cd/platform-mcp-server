import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  ServerRequest,
  ServerNotification,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import {
  McpServer,
  ResourceTemplate,
  ResourceMetadata,
  ReadResourceCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";

// Resource handler type definition
export type ResourceHandler = (uri: string) => Promise<string>;

// Resource definition interface
export interface ResourceDefinition {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
  handler: ResourceHandler;
  // For future authentication/authorization
  requiredPermissions?: string[];
}

// Template handler type definition
export type ResourceTemplateHandler = (uri: string) => Promise<string>;

// Template definition interface
export interface ResourceTemplateDefinition {
  uriTemplate: string;
  name: string;
  mimeType?: string;
  description?: string;
  handler: ResourceTemplateHandler;
  // For future authentication/authorization
  requiredPermissions?: string[];
}

// Registry to store all available resources
const resourceRegistry: ResourceDefinition[] = [];
const templateRegistry: ResourceTemplateDefinition[] = [];

// Register a direct resource in the registry
export function registerResource(resourceDef: ResourceDefinition): void {
  // Check if resource with same URI already exists
  const existingIndex = resourceRegistry.findIndex((r) => r.uri === resourceDef.uri);
  if (existingIndex >= 0) {
    // Replace existing resource
    resourceRegistry[existingIndex] = resourceDef;
  } else {
    // Add new resource
    resourceRegistry.push(resourceDef);
  }
}

// Register a resource template in the registry
export function registerResourceTemplate(templateDef: ResourceTemplateDefinition): void {
  // Check if template with same URI template already exists
  const existingIndex = templateRegistry.findIndex(
    (t) => t.uriTemplate === templateDef.uriTemplate
  );
  if (existingIndex >= 0) {
    // Replace existing template
    templateRegistry[existingIndex] = templateDef;
  } else {
    // Add new template
    templateRegistry.push(templateDef);
  }
}

// Get resources filtered by permissions (for future auth integration)
export function getAuthorizedResources(userPermissions: string[] = []): ResourceDefinition[] {
  return resourceRegistry.filter((resource) => {
    // If no permissions required, resource is available to everyone
    if (!resource.requiredPermissions || resource.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return resource.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
}

// Get templates filtered by permissions (for future auth integration)
export function getAuthorizedTemplates(
  userPermissions: string[] = []
): ResourceTemplateDefinition[] {
  return templateRegistry.filter((template) => {
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
    // Using the signature: resource(name: string, uri: string, metadata: ResourceMetadata, readCallback: ReadResourceCallback)
    server.resource(
      resource.name,
      resource.uri,
      {
        mimeType: resource.mimeType || "text/plain",
        description: resource.description,
      },
      async (
        _uri: URL,
        _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ): Promise<ReadResourceResult> => {
        try {
          const content = await resource.handler(resource.uri);
          return {
            contents: [
              {
                uri: resource.uri,
                text: content,
                mimeType: resource.mimeType || "text/plain",
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`Error retrieving resource: ${error.message}`);
        }
      }
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
    // Create a proper ResourceTemplate instance
    const resourceTemplate = new ResourceTemplate(template.uriTemplate, {
      list: undefined, // No list callback for now
    });

    server.resource(
      template.name,
      resourceTemplate,
      {
        mimeType: template.mimeType || "text/plain",
        description: template.description,
      },
      async (
        uri: URL,
        _variables: any,
        _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ): Promise<ReadResourceResult> => {
        try {
          const content = await template.handler(uri.toString());
          return {
            contents: [
              {
                uri: uri.toString(),
                text: content,
                mimeType: template.mimeType || "text/plain",
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`Error retrieving resource: ${error.message}`);
        }
      }
    );
  }
}
