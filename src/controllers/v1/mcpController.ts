import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { registerToolsWithServer } from "../../tools/registry.js";
import { registerResourcesWithServer, registerResourceTemplatesWithServer } from "../../resources/registry.js";
import { registerPromptsWithServer } from "../../prompts/registry.js";
import { initializeTools } from "../../tools/index.js";
import { initializeResources } from "../../resources/index.js";
import { initializePrompts } from "../../prompts/index.js";
import { getUserInfo } from "../../auth/user.js";

import pkg from "../../../package.json" with { type: "json" };

// Extend Request type to include MCP auth info
interface AuthenticatedRequest extends Request {
  auth?: AuthInfo;
}

const { name, version } = pkg;

// Initialize all available capabilities
initializeTools();
initializeResources();
initializePrompts();

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export const mcpController = async (req: Request, res: Response, _next: NextFunction) => {
  // Check for existing session ID
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
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
      }
    };

    const server = new McpServer({ name, version });

    // Get user info (with development mode support)
    const authInfo = (req as AuthenticatedRequest).auth;
    const user = getUserInfo(authInfo);
    const userPermissions = user.permissions || [];

    // Log user access for audit purposes
    console.log(`User ${user.email} (${user.id}) accessing MCP server with permissions:`, userPermissions);

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
