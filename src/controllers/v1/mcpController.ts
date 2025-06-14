import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerToolsWithServer } from "../../tools/registry.js";
import {
  registerResourcesWithServer,
  registerResourceTemplatesWithServer,
} from "../../resources/registry.js";
import { registerPromptsWithServer } from "../../prompts/registry.js";
import { initializeTools } from "../../tools/index.js";
import { initializeResources } from "../../resources/index.js";
import { initializePrompts } from "../../prompts/index.js";
import { AuthenticatedUser } from "../../auth/index.js";

import pkg from "../../../package.json" with { type: "json" };

// Extend Request type to include authenticated user
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

const { name, version } = pkg;

// Initialize all available capabilities
initializeTools();
initializeResources();
initializePrompts();

// Map to store transports by session ID
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>,
};

export const mcpController = async (req: Request, res: Response, _next: NextFunction) => {
  // Check for existing session ID
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports.streamable[sessionId]) {
    // Reuse existing transport
    transport = transports.streamable[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports.streamable[sessionId] = transport;
      },
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports.streamable[transport.sessionId];
      }
    };

    const server = new McpServer({ name, version });

    // Get user permissions from authenticated user
    const user = (req as AuthenticatedRequest).user;
    const userPermissions = user?.permissions || [];

    // Log user access for audit purposes
    if (user) {
      console.log(`User ${user.email} (${user.id}) accessing MCP server with permissions:`, userPermissions);
    }

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
  if (!sessionId || !transports.streamable[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports.streamable[sessionId];
  await transport.handleRequest(req, res);
};

// Legacy SSE initialization
export const handleLegacySSE = async (req: Request, res: Response, _next: NextFunction) => {
  const server = new McpServer({ name, version });

  // Create SSE transport for legacy clients
  const transport = new SSEServerTransport("execute/v1/messages", res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });

  // Get user permissions from authenticated user
  const user = (req as AuthenticatedRequest).user;
  const userPermissions = user?.permissions || [];

  // Log user access for audit purposes
  if (user) {
    console.log(`User ${user.email} (${user.id}) accessing SSE MCP server with permissions:`, userPermissions);
  }

  // Register all authorized capabilities
  registerToolsWithServer(server, userPermissions);
  registerResourcesWithServer(server, userPermissions);
  registerResourceTemplatesWithServer(server, userPermissions);
  registerPromptsWithServer(server, userPermissions);

  await server.connect(transport);
};

// Legacy message handling for SSE
export const handleLegacyMessage = async (req: Request, res: Response, _next: NextFunction) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
};
