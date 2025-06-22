import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodTypeAny } from "zod";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

export interface ToolDefinition extends Pick<RegisteredTool, "title" | "description" | "inputSchema" | "outputSchema" | "annotations"> {
  requiredPermissions?: string[];
  callback: (args: z.objectOutputType<any, ZodTypeAny>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => Promise<ReturnType<typeof toolResponse>>;
}

interface ToolResponseData {
  message?: string;
  data?: any;
  links?: Record<string, string>;
  metadata?: {
    potentialActions?: string[];
    troubleshooting?: string[];
    [key: string]: any;
  };
  [key: string]: any; // Index signature for MCP compatibility
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
  toolRegistry.set(titleToName(toolDef.title), toolDef);
};

// Get tools filtered by permissions
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
    const { title, description, inputSchema, outputSchema, annotations, callback } = tool;;
    server.registerTool(
      titleToName(title),
      {
        title,
        description,
        inputSchema: inputSchema ? inputSchema.shape : undefined,
        outputSchema: outputSchema ? outputSchema.shape : undefined,
        annotations
      },
      callback
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
