import { McpServer, RegisteredPrompt } from "@modelcontextprotocol/sdk/server/mcp.js";
import { sanitizeString } from "../../lib/string.js";

export interface PromptDefinition extends Pick<RegisteredPrompt, "title" | "description" | "argsSchema"> {
  callback: any;
  requiredPermissions?: string[];
}

// Registry to store all available prompts
const promptRegistry = new Map<string, PromptDefinition>();

// Register a prompt in the registry
export const registerPrompt = (promptDef: PromptDefinition): void => {
  promptRegistry.set(sanitizeString(promptDef.title), promptDef);
};

// Get prompts filtered by permissions
export const getAuthorizedPrompts = (userPermissions: string[] = []): PromptDefinition[] => {
  return Array.from(promptRegistry.values()).filter((prompt) => {
    // If no permissions required, prompt is available to everyone
    if (!prompt.requiredPermissions || prompt.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return prompt.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
};

// Register prompts with an MCP server instance
export const registerPromptsWithServer = (server: McpServer, userPermissions: string[] = []): void => {
  // Filter prompts by permissions
  const authorizedPrompts = getAuthorizedPrompts(userPermissions);

  // Register prompts
  for (const prompt of authorizedPrompts) {
    const { title, description, callback, argsSchema } = prompt;
    if (argsSchema) {
      server.prompt(
        sanitizeString(title),
        description || "",
        argsSchema.shape,
        callback
      );
    } else {
      server.prompt(
        sanitizeString(title),
        description || "",
        callback
      );
    }
  }
};
