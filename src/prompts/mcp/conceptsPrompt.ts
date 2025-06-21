import { PromptDefinition } from "../registry.js";

const callback: PromptDefinition["callback"] = async (_args: any, _extra: any) => {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please explain the differences between MCP tools, prompts, and resources. For each one, describe:

1. What they are and their purpose
2. When to use each one
3. Who can access them (AI vs human)
4. Provide practical examples
5. Show a typical workflow using all three together

Make it beginner-friendly with clear examples, and help me understand when I should create a tool vs a prompt vs a resource in my own MCP server.`,
        },
      },
    ],
  };
};

export const mcpConceptsPrompt: PromptDefinition = {
  name: "mcp_concepts",
  description: "Ask your AI assistant to explain MCP tools, prompts, and resources",
  callback,
};
