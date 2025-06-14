import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import JwksClient, { SigningKey } from "jwks-client";
import jwt from "jsonwebtoken";

import { loadEntraConfig, EntraConfig } from "./config.js";

/**
 * Simple and efficient MS Entra ID token verifier
 */
export class EntraTokenVerifier implements OAuthTokenVerifier {
  private config: EntraConfig;
  private jwksClient: JwksClient;

  constructor() {
    this.config = loadEntraConfig();
    this.jwksClient = new JwksClient({
      jwksUri: `https://login.microsoftonline.com/${this.config.tenantId}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 12 * 60 * 60 * 1000, // 12 hours
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      const payload = await this.validateToken(token);
      return this.createAuthInfo(token, payload);
    } catch (error) {
      throw new Error(`Entra ID validation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async validateToken(token: string): Promise<any> {
    // Decode token header to get key ID
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
      throw new Error("Invalid token format");
    }

    const kid = decoded.header.kid;

    // Get signing key and verify
    return new Promise((resolve, reject) => {
      this.jwksClient.getSigningKey(kid, (err: Error | null, key: SigningKey) => {
        if (err || !key) {
          reject(new Error("Failed to get signing key"));
          return;
        }

        jwt.verify(token, key.getPublicKey(), {
          issuer: `https://login.microsoftonline.com/${this.config.tenantId}/v2.0`,
          audience: this.config.clientId,
          algorithms: ["RS256"],
        }, (verifyErr, payload) => {
          if (verifyErr) reject(new Error(`Token verification failed: ${verifyErr.message}`));
          else if (!payload || typeof payload === "string") reject(new Error("Invalid payload"));
          else resolve(payload);
        });
      });
    });
  }

  private createAuthInfo(token: string, payload: any): AuthInfo {
    const roles = payload.roles || [];

    // Use roles directly as permissions for internal tooling
    const permissions = roles.slice(); // Create a copy of roles array

    return {
      token,
      clientId: payload.aud,
      scopes: payload.scp ? payload.scp.split(" ") : [],
      expiresAt: payload.exp,
      extra: {
        userId: payload.sub || payload.oid,
        email: payload.email || payload.preferred_username || payload.upn,
        name: payload.name,
        roles,
        permissions,
      },
    };
  }
}
