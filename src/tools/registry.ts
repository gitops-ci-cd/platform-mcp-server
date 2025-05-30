import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolDefinition extends Pick<RegisteredTool, "description" | "inputSchema" | "outputSchema" | "annotations" | "callback"> {
  name: string;
  requiredPermissions?: string[]; // For future authentication/authorization
}

// Registry to store all available tools
const toolRegistry = new Map<string, ToolDefinition>();

// Register a tool in the registry
export function registerTool(toolDef: ToolDefinition): void {
  toolRegistry.set(toolDef.name, toolDef);
}

// Get tools filtered by permissions (for future auth integration)
export function getAuthorizedTools(userPermissions: string[] = []): ToolDefinition[] {
  return Array.from(toolRegistry.values()).filter((tool) => {
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
    const { name, description, inputSchema, outputSchema, annotations, callback } = tool;
    server.registerTool(
      name,
      {
        description,
        inputSchema: inputSchema ? inputSchema.shape : undefined,
        outputSchema: outputSchema ? outputSchema.shape : undefined,
        annotations
      },
      callback
    );
  }
}
