import { Request, Response, NextFunction } from "express";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { setRequestContext } from "./context.js";

// Extend Request type to include MCP auth info
interface AuthenticatedRequest extends Request {
  auth?: AuthInfo;
}

/**
 * User context middleware - sets request context from authenticated user info
 * Assumes authentication has already been handled by MCP auth router
 */
export const userContextMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const info = req.auth;
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  setRequestContext({ info, sessionId });

  next();
};
