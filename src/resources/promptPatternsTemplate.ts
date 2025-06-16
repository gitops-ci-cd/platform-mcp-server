import { ResourceTemplate, ListResourcesCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition } from "./registry.js";

const patterns: Record<string, { title: string; content: string }> = {
  "few-shot": {
    title: "Few-Shot Learning Patterns",
    content: `# Few-Shot Learning Patterns in MCP Prompts

## Overview
Few-shot learning uses example conversations to teach the AI how to respond in specific situations.

## Basic Pattern
\`\`\`typescript
const messages = [
  {
    role: "system",
    content: { type: "text", text: "You are a helpful coding assistant" }
  },
  // Example 1
  {
    role: "user",
    content: { type: "text", text: "How do I handle errors?" }
  },
  {
    role: "assistant",
    content: { type: "text", text: "Use try-catch blocks..." }
  },
  // Actual query
  {
    role: "user",
    content: { type: "text", text: "Now help me with my MCP server" }
  }
];
\`\`\`

## Best Practices
1. Use 2-3 examples
2. Show variety in question types
3. Be consistent in response style
4. Include edge cases
5. Match your domain`
  },

  "conversational": {
    title: "Conversational Context Patterns",
    content: `# Conversational Context Patterns in MCP Prompts

## Overview
Conversational patterns create rich, contextual interactions by building conversation history.

## Multi-Turn Context
\`\`\`typescript
const messages = [
  {
    role: "system",
    content: { type: "text", text: "You are a patient debugging partner." }
  },
  {
    role: "user",
    content: { type: "text", text: "I'm having API issues" }
  },
  {
    role: "assistant",
    content: { type: "text", text: "What specific symptoms?" }
  }
];
\`\`\`

## Best Practices
1. Maintain consistent persona
2. Reference previous context
3. Build complexity progressively
4. Stay focused on the topic`
  },

  "system-persona": {
    title: "System Persona Patterns",
    content: `# System Persona Patterns in MCP Prompts

## Overview
System messages shape AI behavior, setting tone and expertise level.

## Expert Personas
\`\`\`typescript
// Senior Developer
{
  role: "system",
  content: {
    type: "text",
    text: "You are a senior software engineer with 10+ years experience."
  }
}

// Debugging Specialist
{
  role: "system",
  content: {
    type: "text",
    text: "You debug systematically and ask clarifying questions."
  }
}
\`\`\`

## Best Practices
1. Be specific about persona
2. Set clear expectations
3. Include constraints
4. Match task requirements`
  },

  "dynamic": {
    title: "Dynamic Prompt Patterns",
    content: `# Dynamic Prompt Patterns in MCP

## Overview
Dynamic prompts adapt based on runtime arguments and context.

## Argument-Based Adaptation
\`\`\`typescript
const callback = async (args) => {
  const { userLevel, topic } = args;

  const systemMessages = {
    beginner: "Use simple language and analogies",
    expert: "Focus on advanced concepts"
  };

  return {
    messages: [
      {
        role: "system",
        content: { type: "text", text: systemMessages[userLevel] }
      }
    ]
  };
};
\`\`\`

## Best Practices
1. Validate arguments gracefully
2. Provide sensible defaults
3. Test all argument combinations
4. Log for debugging`
  }
};

const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const type = variables.type as string;

  const pattern = patterns[type];

  if (!pattern) {
    throw new Error(`Unknown prompt pattern type: ${type}`);
  }

  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "text/markdown",
        text: pattern.content
      }
    ]
  };
};

const list: ListResourcesCallback = async () => {
  return {
    resources: Object.keys(patterns).map((type: string) => ({
      uri: `mcp://prompt-patterns/${type}`,
      name: `MCP Prompt Pattern: ${type}`,
      description: `Guide for ${type} prompt patterns in MCP`,
      mimeType: "text/markdown",
    })),
  };
};

export const promptPatternsTemplate: ResourceTemplateDefinition = {
  name: "MCP Prompt Patterns Template",
  resourceTemplate: new ResourceTemplate(
    "mcp://prompt-patterns/{type}",
    {
      list,
      complete: {
        type: async () => Object.keys(patterns),
      },
    }
  ),
  metadata: {
    description: "Comprehensive guides for different MCP prompt patterns",
    mimeType: "text/markdown",
  },
  readCallback,
};
