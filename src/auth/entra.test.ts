import { createEntraAuthMiddleware, getUserFromAuthInfo } from "./entra.js";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

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

      expect(() => createEntraAuthMiddleware()).toThrow(
        "MS_ENTRA_TENANT_ID and MS_ENTRA_CLIENT_ID are required"
      );
    });
  });

  describe("getUserFromAuthInfo", () => {
    it("should extract user information from AuthInfo", () => {
      const authInfo: AuthInfo = {
        token: "test-token",
        clientId: "test-client-id",
        scopes: ["openid", "profile"],
        expiresAt: Date.now() / 1000 + 3600,
        extra: {
          userId: "user-123",
          email: "test@example.com",
          name: "Test User",
          roles: ["developer"],
          permissions: ["k8s:view", "k8s:restart"],
        },
      };

      const user = getUserFromAuthInfo(authInfo);

      expect(user).toEqual({
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        roles: ["developer"],
        permissions: ["k8s:view", "k8s:restart"],
      });
    });

    it("should handle missing extra data", () => {
      const authInfo: AuthInfo = {
        token: "test-token",
        clientId: "test-client-id",
        scopes: [],
      };

      const user = getUserFromAuthInfo(authInfo);

      expect(user).toEqual({
        id: undefined,
        email: undefined,
        name: undefined,
        roles: undefined,
        permissions: undefined,
      });
    });
  });
});
