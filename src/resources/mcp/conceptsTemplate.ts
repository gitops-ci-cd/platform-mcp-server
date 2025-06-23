import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";

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
    return resourceResponse({
      message: `Unknown concept: ${concept}`,
      metadata: {
        troubleshooting: [
          "Check the concept name for typos",
          "Use auto-completion to see available concepts",
        ],
        availableConcepts: Object.keys(conceptSummaries),
      },
      links: {
        "MCP Documentation": "https://modelcontextprotocol.io/docs/concepts/",
      }
    }, new URL(uri.href));
  }

  return resourceResponse({
    message: conceptSummaries[concept],
    metadata: {
      potentialActions: [
        "Build a custom MCP resource",
      ],
    },
    links: {
      "MCP Introduction": "https://modelcontextprotocol.io/introduction",
      "Documentation": uri.href,
    }
  }, uri);
};

export const mcpConceptsTemplate: ResourceTemplateDefinition = {
  title: "MCP Concepts",
  resourceTemplate: new ResourceTemplate(
    "https://modelcontextprotocol.io/docs/concepts/{concept}",
    {
      list: undefined,
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
