import { Request, Response } from "express";

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "unknown",
    environment: process.env.NODE_ENV || "development",
  });
};

export const authHealthCheck = (req: Request, res: Response) => {
  // This endpoint requires authentication
  const user = (req as any).user;

  res.status(200).json({
    status: "authenticated",
    timestamp: new Date().toISOString(),
    user: {
      id: user?.id,
      email: user?.email,
      name: user?.name,
      roles: user?.roles || [],
      permissions: user?.permissions || [],
    },
  });
};
