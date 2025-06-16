import { PromptDefinition } from "./registry.js";

const callback: PromptDefinition["callback"] = async (_args: any, _extra: any) => {

  return {
    messages: [
      {
        role: "system" as const,
        content: {
          type: "text" as const,
          text: "You are a patient teacher. Build upon previous explanations and adapt your teaching style based on the student's responses."
        }
      },
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "I'm new to programming. What's a function?"
        }
      },
      {
        role: "assistant" as const,
        content: {
          type: "text" as const,
          text: "A function is like a recipe! It's a set of instructions that takes some ingredients (inputs) and produces a dish (output). For example, a 'makeToast' function might take bread and butter as inputs and give you toast as output."
        }
      },
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "That makes sense! Can functions call other functions?"
        }
      },
      {
        role: "assistant" as const,
        content: {
          type: "text" as const,
          text: "Absolutely! Just like cooking - your 'makeBreakfast' function might call the 'makeToast' function, then call a 'scrambleEggs' function, and finally call a 'pourJuice' function. Each function does one job well, and they work together."
        }
      },
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Now I'm working with MCP servers. How do the functions (tools?) work together there?"
        }
      }
    ]
  };
};

export const mcpAdvancedPrompt: PromptDefinition = {
  name: "mcp_role_example",
  description: "Demonstrates advanced prompt message roles for multi-turn, contextual AI interactions",
  callback
};
