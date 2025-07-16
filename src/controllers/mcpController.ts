import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { registerToolsWithServer, initializeTools } from "../tools/index.js";
import { registerResourcesWithServer, registerResourceTemplatesWithServer, initializeResources } from "../resources/index.js";
import { registerPromptsWithServer, initializePrompts } from "../prompts/index.js";
import { getCurrentUser, getCurrentSessionId } from "../../lib/auth/index.js";
import { resourceCache } from "../../lib/cache.js";

import pkg from "../../package.json" with { type: "json" };

const { name, version, description, displayName } = pkg;

// Initialize all available capabilities
initializeTools();
initializeResources();
initializePrompts();

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export const mcpController = async (req: Request, res: Response, _next: NextFunction) => {
  // Get session ID from context (set by middleware)
  let sessionId: string | undefined;
  try {
    sessionId = getCurrentSessionId();
  } catch {
    // No session context available
    sessionId = undefined;
  }

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
      },
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];

        // Clear session-specific cache entries
        resourceCache.clearSession(transport.sessionId);
      }
    };

    const server = new McpServer({
      name,
      version,
      title: displayName,
      description,
    });

    const user = getCurrentUser("accessing MCP server");
    const userPermissions = user.permissions || [];

    // Register all authorized capabilities
    registerToolsWithServer(server, userPermissions);
    registerResourcesWithServer(server, userPermissions);
    registerResourceTemplatesWithServer(server, userPermissions);
    registerPromptsWithServer(server, userPermissions);

    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
};

// Reusable handler for GET and DELETE requests
export const handleSessionRequest = async (req: Request, res: Response, _next: NextFunction) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};
