import { z } from "zod";
import { PromptDefinition } from "./registry.js";

const callback: PromptDefinition["callback"] = async (args: any, _extra: any) => {
  // More flexible complexity handling
  const complexity = args.complexity?.toLowerCase().trim() || "simple";
  const isDetailed = complexity.includes("detail") || complexity.includes("technical") || complexity.includes("advanced");

  const examples = {
    simple: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "What's an MCP resource?"
        }
      },
      {
        role: "assistant" as const,
        content: {
          type: "text" as const,
          text: "An MCP resource is like a file or document that provides information. Think of it as a reference book that you can ask me to read and use in our conversation."
        }
      }
    ],
    detailed: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Explain MCP resources with technical details"
        }
      },
      {
        role: "assistant" as const,
        content: {
          type: "text" as const,
          text: "MCP resources are URI-identified data sources that expose content for LLM consumption. They support both static resources (fixed URIs) and dynamic resource templates (URI patterns with variables). Resources are user-controlled, meaning humans select which resources to include in conversations, and they support real-time updates via subscriptions."
        }
      }
    ]
  };

  const selectedExamples = isDetailed ? examples.detailed : examples.simple;

  return {
    messages: [
      ...selectedExamples,
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Now please explain MCP tools, prompts, and resources using this same style and level of detail."
        }
      }
    ]
  };
};

export const mcpExampleBasedPrompt: PromptDefinition = {
  name: "mcp_concepts_by_example",
  description: "Learn MCP concepts through examples. Use 'simple' for beginner-friendly explanations or 'detailed' for technical depth.",
  argsSchema: z.object({
    complexity: z.string().optional()
      .describe("Level of detail: 'simple' for analogies and basic concepts, 'detailed' for technical explanations")
  }),
  callback
};
