import { z } from "zod";

import { PromptDefinition } from "./registry.js";

const callback: PromptDefinition["callback"] = async (args: any, _extra: any) => {
  const language = args?.language || "TypeScript";

  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `I want to build my first MCP server using ${language}. Please provide:

1. Step-by-step setup instructions for ${language}, leveraging existing libraries and frameworks where possible
2. A simple "Hello World" MCP server example in ${language}
3. How to add a basic tool, prompt, and resource
4. How to test and debug the server
5. Best practices specific to ${language} MCP development
6. Common pitfalls to avoid

Keep it practical with working code examples I can copy and modify.`,
        },
      },
    ],
  };
};

export const mcpGettingStartedPrompt: PromptDefinition = {
  name: "mcp_getting_started",
  description: "Get personalized guidance for building your first MCP server",
  argsSchema: z.object({
    language: z.string().optional().describe("Your preferred programming language (e.g. typescript, python, kotlin)"),
  }),
  callback,
};
