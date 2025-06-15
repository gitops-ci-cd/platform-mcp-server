import { z } from "zod";
import { PromptDefinition } from "./registry.js";

const callback: PromptDefinition["callback"] = async (args: any, _extra: any) => {
  const scenario = args.scenario || "debugging";

  const scenarios = {
    debugging: {
      messages: [
        {
          role: "system" as const,
          content: {
            type: "text" as const,
            text: "You are an expert debugging assistant. Use the conversation history to understand the context and provide targeted debugging advice."
          }
        },
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "My API is returning 500 errors intermittently"
          }
        },
        {
          role: "assistant" as const,
          content: {
            type: "text" as const,
            text: "Let's systematically debug this. Can you check your logs for error patterns? Also, is this happening under specific load conditions or randomly?"
          }
        },
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "The logs show database connection timeouts during peak hours"
          }
        },
        {
          role: "assistant" as const,
          content: {
            type: "text" as const,
            text: "This points to a connection pool issue. Let's check your database connection pool size, timeout settings, and consider implementing connection retry logic with exponential backoff."
          }
        },
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Now I have a similar issue with my MCP server - it's not responding to certain requests. How should I debug this?"
          }
        }
      ]
    },

    teaching: {
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
            text: "Now I'm working with MCP servers. How do the functions (tools) work together there?"
          }
        }
      ]
    },

    codeReview: {
      messages: [
        {
          role: "system" as const,
          content: {
            type: "text" as const,
            text: "You are a senior developer doing code review. Be constructive, reference previous discussions, and maintain consistency in your feedback style."
          }
        },
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Here's my first function:\n\n```javascript\nfunction getData() {\n  return fetch('/api/users').then(r => r.json());\n}\n```"
          }
        },
        {
          role: "assistant" as const,
          content: {
            type: "text" as const,
            text: "Good start! A few suggestions:\n1. Add error handling for failed requests\n2. Consider making this async/await for better readability\n3. The function name could be more specific - maybe `fetchUsers()`?\n4. Add proper TypeScript types for the return value"
          }
        },
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Thanks! Here's my updated version:\n\n```typescript\nasync function fetchUsers(): Promise<User[]> {\n  try {\n    const response = await fetch('/api/users');\n    if (!response.ok) throw new Error('Failed to fetch');\n    return await response.json();\n  } catch (error) {\n    console.error('Error fetching users:', error);\n    return [];\n  }\n}\n```"
          }
        },
        {
          role: "assistant" as const,
          content: {
            type: "text" as const,
            text: "Much better! You've addressed all my previous points. The error handling is solid, and the TypeScript types are clean. One small enhancement: you might want to throw the error instead of returning an empty array, so the caller can decide how to handle failures."
          }
        },
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: "Now I'm building an MCP tool that makes HTTP requests. Should I follow similar patterns?"
          }
        }
      ]
    }
  };

  const selectedScenario = scenarios[scenario as keyof typeof scenarios] || scenarios.debugging;

  return {
    messages: selectedScenario.messages
  };
};

export const mcpAdvancedPrompt: PromptDefinition = {
  name: "mcp_advanced_conversations",
  description: "Demonstrates advanced prompt message roles for multi-turn, contextual AI interactions",
  argsSchema: z.object({
    scenario: z.enum(["debugging", "teaching", "codeReview"]).optional()
      .describe("The conversation scenario to demonstrate")
  }),
  callback
};
