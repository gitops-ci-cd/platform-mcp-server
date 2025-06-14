import { Request, Response, NextFunction } from "express";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { EntraTokenVerifier } from "./tokenVerifier.js";

/**
 * Authentication middleware for MS Entra ID
 * Uses MCP SDK's bearer auth with Entra ID token verification
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // In development mode, skip authentication
  if (process.env.NODE_ENV === "development") {
    console.log("🔓 Development mode: Skipping authentication middleware");
    return next();
  }

  // Use MCP SDK's bearer auth middleware with Entra ID verifier
  const entraAuthMiddleware = requireBearerAuth({
    verifier: new EntraTokenVerifier(),
    requiredScopes: [],
  });

  return entraAuthMiddleware(req, res, next);
};
