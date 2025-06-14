import jwt from "jsonwebtoken";
import jwksClient, { JwksClient } from "jwks-client";
import { Request, Response, NextFunction } from "express";
import { AuthConfig, AuthenticatedUser, JWTPayload } from "./config.js";

export class AuthService {
  private jwksClient: JwksClient;
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = {
      requireHttps: true,
      cacheTtl: 600, // 10 minutes
      roleClaimPath: "roles",
      ...config
    };

    this.jwksClient = jwksClient({
      jwksUri: this.config.jwksUri,
      requestHeaders: {}, // Optional headers
      timeout: 30000, // Defaults to 30s
      cache: true,
      cacheMaxAge: (this.config.cacheTtl || 600) * 1000, // Convert to milliseconds
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }

  private async getSigningKey(kid: string): Promise<string> {
    const key = await this.jwksClient.getSigningKey(kid);
    return key.getPublicKey();
  }

  private extractUserFromPayload(payload: JWTPayload): AuthenticatedUser {
    // Extract user information from JWT payload
    const id = payload.sub || payload.oid || "";
    const email = payload.email || payload.upn || payload.preferred_username || "";
    const name = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || email;

    // Extract roles from the configured claim path
    let roles: string[] = [];
    if (this.config.roleClaimPath) {
      const roleValue = this.getNestedProperty(payload, this.config.roleClaimPath);
      if (Array.isArray(roleValue)) {
        roles = roleValue;
      } else if (typeof roleValue === "string") {
        roles = [roleValue];
      }
    }

    // Map roles to permissions using the configured mapping
    let permissions: string[] = [];
    if (this.config.permissionMapping) {
      for (const role of roles) {
        const rolePermissions = this.config.permissionMapping[role];
        if (rolePermissions) {
          permissions.push(...rolePermissions);
        }
      }
    }

    return {
      id,
      email,
      name,
      roles,
      permissions,
      tenantId: payload.tid,
      groups: payload.groups || [],
    };
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  async validateToken(token: string): Promise<AuthenticatedUser> {
    try {
      // Decode the token header to get the key ID
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || !decoded.header.kid) {
        throw new Error("Invalid token: missing key ID");
      }

      // Get the signing key
      const signingKey = await this.getSigningKey(decoded.header.kid);

      // Verify the token
      const payload = jwt.verify(token, signingKey, {
        audience: this.config.audience,
        issuer: this.config.issuer,
        algorithms: ["RS256"],
      }) as JWTPayload;

      // Extract user information
      return this.extractUserFromPayload(payload);
    } catch (error) {
      throw new Error(`Token validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({
            error: "Unauthorized",
            message: "Missing or invalid Authorization header"
          });
        }

        const token = authHeader.substring(7); // Remove "Bearer " prefix

        // Validate token and extract user
        const user = await this.validateToken(token);

        // Attach user to request object
        (req as any).user = user;

        next();
      } catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({
          error: "Unauthorized",
          message: error instanceof Error ? error.message : "Authentication failed"
        });
      }
    };
  }
}
