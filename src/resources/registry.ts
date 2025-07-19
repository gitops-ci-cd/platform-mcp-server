import { URL } from "url";
import {
  McpServer,
  RegisteredResource,
  RegisteredResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import { sanitizeString } from "../../lib/string.js";
import { initializeResources, initializeResourceTemplates } from "./index.js";

// Resource definition interface
export interface ResourceDefinition extends Pick<RegisteredResource, "title" | "metadata"> {
  uri: string;
  requiredPermissions?: string[];
  readCallback: (uri: URL, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<ReturnType<typeof resourceResponse>>;
}

// Template definition interface
export interface ResourceTemplateDefinition extends Pick<RegisteredResourceTemplate, "resourceTemplate" | "title" | "metadata"> {
  requiredPermissions?: string[];
  readCallback: (uri: URL, variables: Variables, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<ReturnType<typeof resourceResponse>>;
}

interface ResourceResponseData {
  message: string;
  data?: any;
  links: Record<string, string>;
  metadata: {
    potentialActions?: string[];
    troubleshooting?: string[];
    [key: string]: any;
  };
  [key: string]: any; // Index signature for MCP compatibility
}

// Helper function to standardize responses
export const resourceResponse = (data: ResourceResponseData, uri: URL) => {
  return {
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(data, null, 2),
        mimeType: "application/json",
      }
    ]
  };
};

// Registry to store all available resources
export const resourceRegistry = new Map<string, ResourceDefinition>();
export const templateRegistry = new Map<string, ResourceTemplateDefinition>();

// Register a direct resource in the registry
export const registerResource = (resourceDef: ResourceDefinition): void => {
  resourceRegistry.set(resourceDef.uri, resourceDef);
};

// Register a resource template in the registry
export const registerResourceTemplate = (templateDef: ResourceTemplateDefinition): void => {
  templateRegistry.set(sanitizeString(templateDef.title), templateDef);
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
  initializeResources();
  // Filter resources by permissions
  const authorizedResources = getAuthorizedResources(userPermissions);

  // Register direct resources
  for (const resource of authorizedResources) {
    const { title, uri, metadata, readCallback } = resource;
    server.resource(
      sanitizeString(title),
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
  initializeResourceTemplates();
  // Filter templates by permissions
  const authorizedTemplates = getAuthorizedTemplates(userPermissions);

  // Register resource templates
  for (const template of authorizedTemplates) {
    const { title, resourceTemplate, metadata, readCallback } = template;
    server.resource(
      sanitizeString(title),
      resourceTemplate,
      metadata || {},
      readCallback,
    );
  }
};
