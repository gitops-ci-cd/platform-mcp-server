import { z } from "zod";

import { ToolDefinition } from "../registry.js";

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

    return {
      content: [
        {
          type: "text",
          text: `OK ${response.ok} ${response.status}`,
          mimeType: "application/json"
        }
      ],
      structuredContent: healthData
    };

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

    return {
      content: [
        {
          type: "text",
          text: error.message || error.toString(),
          mimeType: "application/json"
        }
      ],
      structuredContent: errorData
    };
  }
};

export const mcpHealthCheckTool: ToolDefinition = {
  name: "CheckMCPServerHealth",
  description: "Check the health status of the MCP server by calling its health endpoint. Returns raw JSON data for the AI to parse.",
  inputSchema: z.object({
    endpoint: z.string().url().optional().default(`http://localhost:${process.env.PORT || "8080"}/health`)
      .describe("The health endpoint URL to check")
  }),
  outputSchema: z.object({
    endpoint: z.string().describe("The endpoint that was checked"),
    timestamp: z.string().describe("ISO timestamp when the check was performed"),
    status: z.object({
      code: z.number().describe("HTTP status code"),
      text: z.string().describe("HTTP status text"),
      healthy: z.boolean().describe("Whether the service is considered healthy")
    }).optional().describe("HTTP response status (only present on successful request)"),
    headers: z.record(z.string()).optional().describe("HTTP response headers (only present on successful request)"),
    body: z.any().optional().describe("Response body content (only present on successful request)"),
    error: z.object({
      type: z.string().describe("Error type"),
      message: z.string().describe("Error message")
    }).optional().describe("Error details (only present on failure)")
  }),
  callback
};
