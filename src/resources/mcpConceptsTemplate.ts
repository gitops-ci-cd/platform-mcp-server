import { ResourceTemplate, ListResourcesCallback } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition } from "./registry.js";

const conceptSummaries: Record<string, string> = {
  architecture: "Core architecture and communication patterns of the Model Context Protocol.",
  resources: "Resources expose data and content that can be read by clients and used as context for LLM interactions.",
  prompts: "Prompts are reusable templates that help users start conversations with specific context or instructions.",
  tools: "Tools are functions that the LLM can call to perform actions or retrieve information.",
  sampling: "Allows servers to request LLM completions through the client.",
  roots: "Defines the boundaries of where servers can operate.",
  transports: "The foundation for communication between clients and servers.",
};

const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const concept = variables.concept as string;
  const summary = conceptSummaries[concept];

  if (!summary) {
    throw new Error(`Unknown concept: ${concept}`);
  }

  return {
    contents: [
      {
        uri: uri.href,
        text: `# MCP Concept: ${concept}

**Source**: <${uri.href}>

## Summary

${summary}

**For complete details, I can access the full documentation at the source URL above.**`,
        mimeType: "text/markdown",
      },
    ],
  };
};

const list: ListResourcesCallback = async () => {
  return {
    resources: Object.keys(conceptSummaries).map(concept => ({
      uri: `https://modelcontextprotocol.io/docs/concepts/${concept}`,
      name: `MCP Concept: ${concept}`,
      description: `Official MCP documentation for ${concept}`,
      mimeType: "text/html",
    })),
  };
};

export const mcpConceptsTemplate: ResourceTemplateDefinition = {
  name: "MCP Concepts",
  resourceTemplate: new ResourceTemplate(
    "https://modelcontextprotocol.io/docs/concepts/{concept}",
    {
      list,
      complete: {
        concept: async () => Object.keys(conceptSummaries),
      },
    }
  ),
  metadata: {
    description: "Official MCP documentation for core concepts",
    mimeType: "text/html",
  },
  readCallback,
};
