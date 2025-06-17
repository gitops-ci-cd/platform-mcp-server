import { z } from "zod";
import { ToolDefinition } from "../registry.js";
import { ServerRequest } from "@modelcontextprotocol/sdk/types.js";

const callback: ToolDefinition["callback"] = async (args, extra) => {
  const { concept, audience, includeExample } = args;

  // Build the explanation prompt based on the concept
  const conceptPrompts = {
    resources: "Explain MCP Resources: what they are, how they work, when to use them, and how they differ from tools and prompts.",
    tools: "Explain MCP Tools: what they are, how they work, when to use them, and how they differ from resources and prompts.",
    prompts: "Explain MCP Prompts: what they are, how they work, when to use them, and how they differ from resources and tools.",
    sampling: "Explain MCP Sampling: what it is, how servers can request LLM completions through clients, and why this is useful.",
    architecture: "Explain MCP Architecture: the client-server model, JSON-RPC communication, and how different components work together.",
    transports: "Explain MCP Transports: how clients and servers communicate, different transport types, and connection patterns.",
    all: "Provide a comprehensive overview of MCP (Model Context Protocol): its purpose, core concepts (resources, tools, prompts, sampling), and architecture."
  };

  const basePrompt = conceptPrompts[concept as keyof typeof conceptPrompts] || conceptPrompts.all;

  // Tailor the explanation based on audience
  const audienceInstructions = {
    beginner: "Explain in simple terms with minimal technical jargon. Use analogies and real-world examples.",
    developer: "Focus on technical implementation details, code examples, and practical development considerations.",
    architect: "Emphasize system design, integration patterns, scalability, and architectural decisions."
  };

  const audienceInstruction = audienceInstructions[audience as keyof typeof audienceInstructions] || audienceInstructions.beginner;

  const exampleInstruction = includeExample
    ? "Include a practical, concrete example showing how this concept works in practice."
    : "Focus on the conceptual explanation without detailed examples.";

  const fullPrompt = `${basePrompt}

${audienceInstruction}

${exampleInstruction}

Structure your response with clear sections and make it engaging and informative.`;

  let explanation: string = "Sampling capability is not available in this environment.";

  try {
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
                text: fullPrompt
              }
            }
          ],
          maxTokens: 1000,
          temperature: 0.7,
          topP: 0.9
        }
      } as ServerRequest,
      z.object({
        model: z.string(),
        stopReason: z.string().optional(),
        role: z.string(),
        content: z.object({
          type: z.string(),
          text: z.string()
        })
      })
    );

    explanation = response.content.text;
  } catch (error: any) {
    console.error("Error in MCP explainer tool:", error.message);
    explanation = `Error generating explanation: ${error.message}`;
  }

  return {
    content: [
      {
        type: "text",
        text: `# MCP ${concept.charAt(0).toUpperCase() + concept.slice(1)} Explanation

${explanation}

---

*This explanation was generated using MCP sampling - a meta example of MCP tools using MCP capabilities!*`
      }
    ],
    structuredContent: {
      concept,
      audience,
      includeExample,
      explanation,
      metadata: {
        generated: new Date().toISOString(),
        usedSampling: explanation !== "Sampling capability is not available in this environment.",
        wordCount: explanation.split(/\s+/).length
      }
    }
  };
};

export const mcpExplainerTool: ToolDefinition = {
  name: "ExplainMCPConcept",
  description: "Generate detailed explanations of MCP concepts using sampling. This tool demonstrates both MCP tools and sampling capabilities by explaining MCP itself!",
  inputSchema: z.object({
    concept: z.enum(["resources", "tools", "prompts", "sampling", "architecture", "transports", "all"])
      .describe("Which MCP concept to explain"),
    audience: z.enum(["beginner", "developer", "architect"]).optional().default("beginner")
      .describe("Target audience for the explanation"),
    includeExample: z.boolean().optional().default(true)
      .describe("Whether to include practical examples in the explanation")
  }),
  outputSchema: z.object({
    concept: z.enum(["resources", "tools", "prompts", "sampling", "architecture", "transports", "all"])
      .describe("The MCP concept that was explained"),
    audience: z.enum(["beginner", "developer", "architect"])
      .describe("The target audience for the explanation"),
    includeExample: z.boolean().describe("Whether examples were included"),
    explanation: z.string().describe("The generated explanation text"),
    metadata: z.object({
      generated: z.string().describe("ISO timestamp when explanation was generated"),
      usedSampling: z.boolean().describe("Whether MCP sampling was used successfully"),
      wordCount: z.number().describe("Approximate word count of the explanation")
    }).describe("Additional metadata about the explanation generation")
  }),
  callback
};
