import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { initializeMcpServer } from "../services/mcpService.js";
import { getCurrentSessionId } from "../../lib/auth/index.js";
import { resourceCache } from "../../lib/cache.js";

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export const httpHandler = async (req: Request, res: Response, _next: NextFunction) => {
  // Get session ID from context (set by middleware)
  let sessionId: string | undefined;
  try {
    sessionId = getCurrentSessionId();
  } catch {
    // No session context available. This is normal during initialization
    sessionId = undefined;
  }

  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    console.info("Initializing new HTTP connection!");
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
        console.info("Closing HTTP connection. Goodbye.");
        delete transports[transport.sessionId];

        // Clear session-specific cache entries
        resourceCache.clearSession(transport.sessionId);
      }
    };

    const server = initializeMcpServer();

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

export const sessionHandler = async (req: Request, res: Response, _next: NextFunction) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};
