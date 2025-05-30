import { z } from "zod";

import { ToolDefinition } from "./registry.js";
import { ServerRequest } from "@modelcontextprotocol/sdk/types.js";

const samplingHandler: ToolDefinition["callback"] = async (args, extra) => {
  // Create style-specific instructions
  let styleInstruction = "";
  switch (args.style) {
    case "concise":
      styleInstruction = "Be brief and to the point.";
      break;
    case "detailed":
      styleInstruction = "Provide comprehensive details and explanations.";
      break;
    case "creative":
      styleInstruction = "Be imaginative and use vivid language.";
      break;
  }

  let generatedText: string = "Sampling capability is not available in this environment.";

  try {
    // Request the client to generate content using the LLM via sendRequest
    const response = await extra.sendRequest(
      // Define the request to the LLM
      {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: args.prompt
              }
            },
            {
              role: "assistant",
              content: {
                type: "text",
                text: `I'll respond to that request. ${styleInstruction}`
              }
            }
          ],
          maxTokens: args.maxTokens,
          temperature: args.style === "creative" ? 0.8 : 0.3,
          topP: args.style === "creative" ? 0.95 : 0.7
        }
      } as ServerRequest,
      // Define the expected response schema
      z.object({
        model: z.string(),
        stopReason: z.string(),
        role: z.string(),
        content: z.object({
          type: z.string(),
          text: z.string()
        })
      })
    );

    console.debug("LLM response:", response);

    // Extract the generated text
    generatedText = response.content.text;
  } catch (error: any) {
    console.error("Error in samplingHandler:", error.message);
  }

  return {
    result: {
      originalPrompt: args.prompt,
      style: args.style,
      generatedText: generatedText,
      tokenCount: generatedText.split(/\s+/).length // Rough approximation
    },
    content: [
      {
        type: "text",
        text: generatedText
      }
    ]
  };
};

export const samplingTool: ToolDefinition = {
  name: "Generate Content",
  description: "Generate content using the LLM with different styles and parameters",
  inputSchema: z.object({
    prompt: z.string().optional().default("Tell me something interesting")
      .describe("The prompt to send to the LLM"),
    style: z.enum(["concise", "detailed", "creative"]).optional().default("concise")
      .describe("The style of response to generate"),
    maxTokens: z.number().int().positive().max(1000).optional().default(250)
      .describe("Maximum number of tokens to generate")
  }),
  callback: samplingHandler
};
