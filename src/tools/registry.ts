import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface ToolDefinition extends Pick<RegisteredTool, "description" | "inputSchema" | "outputSchema" | "annotations" | "callback"> {
  name: string;
  requiredPermissions?: string[]; // For future authentication/authorization
}

interface ToolResponseData {
  message?: string;
  data?: any;
  links?: Record<string, string>;
  metadata?: {
    potentialActions?: Record<string, any>;
    troubleshooting?: Record<string, any>;
    [key: string]: any;
  };
}

// Helper function to standardize tool responses
export const toolResponse = (data: ToolResponseData, isError: boolean = false) => {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
        mimeType: "application/json"
      }
    ],
    structuredContent: data,
    isError
  };
};

// Registry to store all available tools
const toolRegistry = new Map<string, ToolDefinition>();

// Register a tool in the registry
export const registerTool = (toolDef: ToolDefinition): void => {
  toolRegistry.set(toolDef.name, toolDef);
};

// Get tools filtered by permissions (for future auth integration)
export const getAuthorizedTools = (userPermissions: string[] = []): ToolDefinition[] => {
  return Array.from(toolRegistry.values()).filter((tool) => {
    // If no permissions required, tool is available to everyone
    if (!tool.requiredPermissions || tool.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return tool.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
};

// Register all authorized tools with an MCP server instance
export const registerToolsWithServer = (server: McpServer, userPermissions: string[] = []): void => {
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
};
