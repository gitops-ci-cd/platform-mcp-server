import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolResult,
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Tool handler type definition
export type ToolHandler = (
  args: { [x: string]: any },
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
) => Promise<CallToolResult>;

// Tool definition interface
export interface ToolDefinition {
  name: string;
  description: string;
  handler: ToolHandler;
  // For future authentication/authorization
  requiredPermissions?: string[];
}

// Registry to store all available tools
const toolRegistry: ToolDefinition[] = [];

// Register a tool in the registry
export function registerTool(toolDef: ToolDefinition): void {
  // Check if tool with same name already exists
  const existingIndex = toolRegistry.findIndex((t) => t.name === toolDef.name);
  if (existingIndex >= 0) {
    // Replace existing tool
    toolRegistry[existingIndex] = toolDef;
  } else {
    // Add new tool
    toolRegistry.push(toolDef);
  }
}

// Get tools filtered by permissions (for future auth integration)
export function getAuthorizedTools(userPermissions: string[] = []): ToolDefinition[] {
  return toolRegistry.filter((tool) => {
    // If no permissions required, tool is available to everyone
    if (!tool.requiredPermissions || tool.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return tool.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
}

// Register all authorized tools with an MCP server instance
export function registerToolsWithServer(server: McpServer, userPermissions: string[] = []): void {
  const authorizedTools = getAuthorizedTools(userPermissions);

  for (const tool of authorizedTools) {
    server.registerTool(tool.name, { description: tool.description }, tool.handler);
  }
}
