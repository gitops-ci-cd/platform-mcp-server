import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  ServerRequest,
  ServerNotification,
  GetPromptResult,
} from "@modelcontextprotocol/sdk/types.js";
import { McpServer, PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

// Prompt handler type definition
export type PromptHandler = () => Promise<string>;

// Prompt definition interface
export interface PromptDefinition {
  name: string;
  description?: string;
  handler: PromptHandler;
  // For future authentication/authorization
  requiredPermissions?: string[];
}

// Registry to store all available prompts
const promptRegistry: PromptDefinition[] = [];

// Register a prompt in the registry
export function registerPrompt(promptDef: PromptDefinition): void {
  // Check if prompt with same name already exists
  const existingIndex = promptRegistry.findIndex((p) => p.name === promptDef.name);
  if (existingIndex >= 0) {
    // Replace existing prompt
    promptRegistry[existingIndex] = promptDef;
  } else {
    // Add new prompt
    promptRegistry.push(promptDef);
  }
}

// Get prompts filtered by permissions (for future auth integration)
export function getAuthorizedPrompts(userPermissions: string[] = []): PromptDefinition[] {
  return promptRegistry.filter((prompt) => {
    // If no permissions required, prompt is available to everyone
    if (!prompt.requiredPermissions || prompt.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has any of the required permissions
    return prompt.requiredPermissions.some((perm) => userPermissions.includes(perm));
  });
}

// Get all prompts
export function getAllPrompts(): PromptDefinition[] {
  return [...promptRegistry];
}

// Register prompts with an MCP server instance
export function registerPromptsWithServer(server: McpServer, userPermissions: string[] = []): void {
  // Filter prompts by permissions
  const authorizedPrompts = getAuthorizedPrompts(userPermissions);

  // Register prompts
  for (const prompt of authorizedPrompts) {
    // Using the signature: prompt(name: string, description: string, cb: PromptCallback)
    server.prompt(
      prompt.name,
      prompt.description || "",
      async (
        _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
      ): Promise<GetPromptResult> => {
        try {
          const content = await prompt.handler();
          return {
            messages: [
              {
                role: "assistant",
                content: {
                  type: "text",
                  text: content,
                },
              },
            ],
          };
        } catch (error: any) {
          throw new Error(`Error executing prompt: ${error.message}`);
        }
      }
    );
  }
}
