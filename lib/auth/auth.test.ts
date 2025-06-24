import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import { EntraTokenVerifier } from "./tokenVerifier.js";
import { getUserInfo } from "./user.js";

// Mock environment variables
const mockEnv = {
  MS_ENTRA_TENANT_ID: "test-tenant-id",
  MS_ENTRA_CLIENT_ID: "test-client-id",
};

// Mock JWKS client
jest.mock("jwks-client", () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockImplementation((kid, callback) => {
      callback(null, {
        getPublicKey: () => "mock-public-key"
      });
    })
  }));
});

// Mock jsonwebtoken
jest.mock("jsonwebtoken", () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

describe("Entra ID Authentication", () => {
  beforeEach(() => {
    // Set up environment variables
    Object.assign(process.env, mockEnv);
    jest.clearAllMocks();
  });

  describe("Configuration", () => {
    it("should handle missing environment variables", () => {
      delete process.env.MS_ENTRA_TENANT_ID;

      expect(() => new EntraTokenVerifier()).toThrow(
        "MS_ENTRA_TENANT_ID and MS_ENTRA_CLIENT_ID are required"
      );
    });
  });

  describe("getUserInfo", () => {
    it("should return dev user in development mode", () => {
      process.env.NODE_ENV = "development";

      const user = getUserInfo(); // No authInfo needed in dev mode

      expect(user).toEqual({
        id: "dev-user",
        email: "developer@localhost",
        name: "Development User",
        roles: ["admin"],
        permissions: ["admin"],
      });
    });

    it("should require authInfo in production mode", () => {
      process.env.NODE_ENV = "production";

      expect(() => getUserInfo()).toThrow("Authentication required");
    });

    it("should use provided authInfo in production mode", () => {
      process.env.NODE_ENV = "production";

      const authInfo: AuthInfo = {
        token: "test-token",
        clientId: "test-client",
        scopes: ["openid"],
        extra: {
          userId: "test-user",
          email: "test@example.com",
          name: "Test User",
          roles: ["viewer"],
          permissions: ["viewer"],
        },
      };

      const user = getUserInfo(authInfo);

      expect(user).toEqual({
        id: "test-user",
        email: "test@example.com",
        name: "Test User",
        roles: ["viewer"],
        permissions: ["viewer"],
      });
    });
  });
});
