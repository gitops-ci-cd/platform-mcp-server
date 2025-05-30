import { McpServer, RegisteredPrompt, PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface PromptDefinition extends Pick<RegisteredPrompt, "description" | "callback"> {
  name: string;
  callback: PromptCallback;
  requiredPermissions?: string[]; // For future authentication/authorization
}

// Registry to store all available prompts
const promptRegistry = new Map<string, PromptDefinition>();

// Register a prompt in the registry
export function registerPrompt(promptDef: PromptDefinition): void {
  promptRegistry.set(promptDef.name, promptDef);
}

// Get prompts filtered by permissions (for future auth integration)
export function getAuthorizedPrompts(userPermissions: string[] = []): PromptDefinition[] {
  return Array.from(promptRegistry.values()).filter((prompt) => {
    // If no permissions required, prompt is available to everyone
    if (!prompt.requiredPermissions || prompt.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return prompt.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
}

// Register prompts with an MCP server instance
export function registerPromptsWithServer(server: McpServer, userPermissions: string[] = []): void {
  // Filter prompts by permissions
  const authorizedPrompts = getAuthorizedPrompts(userPermissions);

  // Register prompts
  for (const prompt of authorizedPrompts) {
    const { name, description, callback } = prompt;
    server.prompt(
      name,
      description || "",
      callback
    );
  }
}
