import { Request, Response, NextFunction } from "express";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";

import { getUserInfo } from "./user.js";
import { setRequestContext } from "./context.js";
import { EntraTokenVerifier } from "./tokenVerifier.js";

// Extend Request type to include MCP auth info
interface AuthenticatedRequest extends Request {
  auth?: AuthInfo;
}

/**
 * Authentication middleware for MS Entra ID
 * Uses MCP SDK's bearer auth with Entra ID token verification
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // In development mode, skip authentication
  if (process.env.NODE_ENV === "development") {
    console.debug("🔓 Development mode: Skipping authentication middleware");
    return next();
  }

  // Use MCP SDK's bearer auth middleware with Entra ID verifier
  const entraAuthMiddleware = requireBearerAuth({
    verifier: new EntraTokenVerifier(),
    requiredScopes: [],
  });

  return entraAuthMiddleware(req, res, next);
};

export const userContextMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = getUserInfo(req.auth);
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  setRequestContext({ user, sessionId });

  next();
};
