import { ResourceDefinition } from "./registry.js";

export const mcpQuickstartResource: ResourceDefinition = {
  uri: "https://modelcontextprotocol.io/quickstart",
  name: "MCP Quickstart Guide",
  metadata: {
    description: "Official MCP documentation: Quickstart Guide",
    mimeType: "text/html",
  },
  readCallback: async (uri, _variables) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: `# MCP Quickstart Guide

**Source**: <${uri.href}>

## Summary

Step-by-step guide to building your first MCP server.

**For complete details, I can access the full documentation at the source URL above.**`,
          mimeType: "text/markdown",
        },
      ],
    };
  },
};
