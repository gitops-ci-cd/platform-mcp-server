import { Request, Response } from "express";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { getUserFromAuthInfo } from "../auth/entra.js";

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
    environment: process.env.NODE_ENV || "development",
  });
};

export const authHealthCheck = (req: Request, res: Response) => {
  // This endpoint requires authentication - auth info is added by MCP SDK middleware
  const authInfo = (req as any).auth as AuthInfo | undefined;
  const user = authInfo ? getUserFromAuthInfo(authInfo) : null;

  res.status(200).json({
    status: "authenticated",
    timestamp: new Date().toISOString(),
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      permissions: user.permissions,
    } : null,
  });
};
