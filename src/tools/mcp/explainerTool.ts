import { z } from "zod";
import {
  ServerRequest,
  CreateMessageResultSchema,
  ElicitResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ToolDefinition, toolResponse } from "../registry.js";

const inputSchema = z.object({
  concept: z
    .enum([
      "resources",
      "tools",
      "prompts",
      "sampling",
      "elicitation",
      "roots",
    ])
    .describe("Which MCP concept to explain"),
});

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { concept } = args;
  let isError = false;

  // Build the explanation prompt based on the concept
  const conceptPrompts = {
    resources: "Explain MCP Resources: what they are, how they work, when to use them, and how they differ from tools and prompts.",
    tools: "Explain MCP Tools: what they are, how they work, when to use them, and how they differ from resources and prompts.",
    prompts: "Explain MCP Prompts: what they are, how they work, when to use them, and how they differ from resources and tools.",
    sampling: "Explain MCP Sampling: what it is, how servers can request LLM completions through clients, and why this is useful.",
    elicitation: "Explain MCP Elicitation: how it works, its purpose, and its role in the overall MCP framework.",
    roots: "Explain MCP Roots: how they define filesystem boundaries for server operations and allow clients to specify which directories servers should focus on.",
    all: "Provide a comprehensive overview of MCP (Model Context Protocol): its purpose, core concepts, and architecture.",
  };

  const basePrompt = conceptPrompts[concept as keyof typeof conceptPrompts] || conceptPrompts.all;

  // Tailor the explanation based on audience
  const audienceInstructions = {
    beginner: "Explain in simple terms with minimal technical jargon. Use analogies and real-world examples.",
    developer: "Focus on technical implementation details, code examples, and practical development considerations.",
    architect: "Emphasize system design, integration patterns, scalability, and architectural decisions.",
  };

  const fullPrompt = `${basePrompt}

Include a practical, concrete example showing how this concept works in practice.

Structure your response with clear sections and make it engaging and informative.`;

  let audience: string = "";
  let explanation: string = "Sampling capability is not available in this environment.";

  try {
    const elicitation = await extra.sendRequest(
      {
        method: "elicitation/create",
        params: {
          message: "How would you like to explain this MCP concept?",
          requestedSchema: {
            type: "object",
            properties: {
              audience: {
                type: "string",
                title: "Audience",
                enum: Object.keys(audienceInstructions),
                enumNames: Object.keys(audienceInstructions).map(
                  (key) => key.charAt(0).toUpperCase() + key.slice(1)
                ),
              },
            },
            required: ["audience"],
          },
        },
      },
      ElicitResultSchema.extend({
        content: z.object({
          audience: z
            .enum(
              Object.keys(audienceInstructions) as [
                keyof typeof audienceInstructions,
                ...Array<keyof typeof audienceInstructions>,
              ]
            )
            .default("beginner"),
        }),
      })
    );

    audience = elicitation.content.audience;

    // Use MCP sampling to generate the explanation
    const response = await extra.sendRequest(
      {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: fullPrompt + `\n\n${audienceInstructions[elicitation.content.audience]}`,
              },
            },
          ],
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9,
        },
      } as ServerRequest,
      CreateMessageResultSchema
    );

    explanation =
      response.content.type === "text"
        ? response.content.text
        : "Expected text response but received different content type";
  } catch (error: any) {
    isError = true;
    console.error("Error in MCP explainer tool:", error.message);
    explanation = `Error generating explanation: ${error.message}`;
  }

  return toolResponse(
    {
      data: explanation,
      message: `Generated explanation for MCP ${concept} concept`,
      links: {
        overview: "https://modelcontextprotocol.io/overview",
        introduction: "https://modelcontextprotocol.io/docs/getting-started/intro",
        architecture: "https://modelcontextprotocol.io/docs/learn/architecture",
        transports: "https://modelcontextprotocol.io/specification/2025-06-18/basic/transports",
        documentation: `https://modelcontextprotocol.io/docs/concepts/${concept}`,
      },
      metadata: {
        concept,
        audience,
        generated: new Date().toISOString(),
        word_count: explanation.split(/\s+/).length,
      },
    },
    isError
  );
};

export const mcpExplainerTool: ToolDefinition = {
  title: "Explain MCP Concept",
  description:
    "Generate detailed explanations of MCP concepts using sampling. This tool demonstrates both MCP tools and sampling capabilities by explaining MCP itself!",
  inputSchema,
  callback,
};
