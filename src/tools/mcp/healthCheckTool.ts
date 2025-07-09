import { z } from "zod";

import { ToolDefinition, toolResponse } from "../registry.js";

const inputSchema = z.object({
  endpoint: z.string().url().optional().default(`http://localhost:${process.env.PORT || "8080"}/health`)
    .describe("The health endpoint URL to check")
});

const callback: ToolDefinition["callback"] = async (args, _extra) => {
  const { endpoint } = args;

  try {
    // Make HTTP request to the health endpoint
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "MCP-Health-Check-Tool"
      },
      // 5 second timeout
      signal: AbortSignal.timeout(5000)
    });

    let responseBody: any = {};

    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        responseBody = await response.json();
      } else {
        responseBody = { text: await response.text() };
      }
    } catch {
      responseBody = { error: "Could not parse response body" };
    }

    // Return structured data that the AI can parse and understand
    const healthData = {
      endpoint,
      timestamp: new Date().toISOString(),
      status: {
        code: response.status,
        text: response.statusText,
        healthy: response.ok
      },
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    };

    return toolResponse({
      data: healthData,
      message: response.ok ? "Health check successful" : `Health check failed with status ${response.status}`,
      links: {
        docs: "https://modelcontextprotocol.io/docs/concepts/architecture#health-checks"
      },
      metadata: {
        endpoint: endpoint,
        timestamp: healthData.timestamp,
        healthy: response.ok
      }
    });

  } catch (error: any) {
    // Return error data in structured format
    const errorData = {
      endpoint,
      timestamp: new Date().toISOString(),
      error: {
        type: error.name || "UnknownError",
        message: error.message || error.toString()
      },
      status: {
        healthy: false
      }
    };

    return toolResponse({
      data: errorData,
      message: `Health check failed: ${error.message}`,
      links: {
        docs: "https://modelcontextprotocol.io/docs/concepts/architecture#health-checks",
        troubleshooting: "https://modelcontextprotocol.io/docs/troubleshooting"
      },
      metadata: {
        endpoint: endpoint,
        timestamp: errorData.timestamp,
        healthy: false,
        error_type: error.name || "UnknownError"
      }
    }, true);
  }
};

export const mcpHealthCheckTool: ToolDefinition = {
  title: "Check MCP Server Health",
  annotations: {
    openWorldHint: true,
  },
  description: "Check the health status of the MCP server by calling its health endpoint. Returns raw JSON data for the AI to parse.",
  inputSchema,
  callback
};
