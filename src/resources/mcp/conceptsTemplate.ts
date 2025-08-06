import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

import { ResourceTemplateDefinition, resourceResponse } from "../registry.js";

const conceptSummaries: Record<string, string> = {
  resources: "[server] Resources provide structured access to information that the host application can retrieve and provide to AI models as context.",
  prompts: "[server] Prompts provide reusable templates. They allow MCP server authors to provide parameterized prompts for a domain, or showcase how to best use the MCP server.",
  tools: "[server] Tools enable AI models to perform actions through server-implemented functions. Each tool defines a specific operation with typed inputs and outputs. The model requests tool execution based on context.",
  sampling: "[client] Sampling allows servers to request language model completions through the client, enabling agentic behaviors while maintaining security and user control.",
  elicitation: "[client] Elicitation enables servers to request specific information from users during interactions, creating more dynamic and responsive workflows.",
  roots: "[client] Roots define filesystem boundaries for server operations, allowing clients to specify which directories servers should focus on.",
};

const readCallback: ResourceTemplateDefinition["readCallback"] = async (uri, variables) => {
  const concept = variables.concept as string;
  const summary = conceptSummaries[concept];

  if (!summary) {
    return resourceResponse(
      {
        message: `Unknown concept: ${concept}`,
        metadata: {
          troubleshooting: [
            "Check the concept name for typos",
            "Use auto-completion to see available concepts",
          ],
          availableConcepts: Object.keys(conceptSummaries),
        },
        links: {
          overview: "https://modelcontextprotocol.io/overview",
          introduction: "https://modelcontextprotocol.io/docs/getting-started/intro",
          architecture: "https://modelcontextprotocol.io/docs/learn/architecture",
          transports: "https://modelcontextprotocol.io/specification/2025-06-18/basic/transports",
        },
      },
      new URL(uri.href)
    );
  }

  return resourceResponse(
    {
      message: conceptSummaries[concept],
      metadata: {
        potentialActions: ["Build a custom MCP resource"],
      },
      links: {
        overview: "https://modelcontextprotocol.io/overview",
        introduction: "https://modelcontextprotocol.io/docs/getting-started/intro",
        architecture: "https://modelcontextprotocol.io/docs/learn/architecture",
        transports: "https://modelcontextprotocol.io/specification/2025-06-18/basic/transports",
        documentation: uri.href,
      },
    },
    uri
  );
};

export const mcpConceptTemplate: ResourceTemplateDefinition = {
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
