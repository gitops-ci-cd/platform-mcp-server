import { AuthService } from "./service.js";
import { createMSEntraAuthConfig, loadAuthConfig } from "./config.js";

// Mock external dependencies
jest.mock("jsonwebtoken");
jest.mock("jwks-client");

describe("Auth Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("createMSEntraAuthConfig", () => {
    it("should create config with MS Entra environment variables", () => {
      process.env.MS_ENTRA_TENANT_ID = "test-tenant-id";
      process.env.MS_ENTRA_CLIENT_ID = "test-client-id";

      const config = createMSEntraAuthConfig();

      expect(config.tenantId).toBe("test-tenant-id");
      expect(config.audience).toBe("test-client-id");
      expect(config.issuer).toBe("https://login.microsoftonline.com/test-tenant-id/v2.0");
      expect(config.jwksUri).toBe("https://login.microsoftonline.com/test-tenant-id/discovery/v2.0/keys");
    });

    it("should throw error when MS Entra environment variables are missing", () => {
      delete process.env.MS_ENTRA_TENANT_ID;
      delete process.env.MS_ENTRA_CLIENT_ID;

      expect(() => createMSEntraAuthConfig()).toThrow(
        "Missing MS Entra configuration. Please set MS_ENTRA_TENANT_ID and MS_ENTRA_CLIENT_ID environment variables."
      );
    });
  });

  describe("loadAuthConfig", () => {
    it("should load config from generic auth environment variables", () => {
      process.env.AUTH_JWKS_URI = "https://example.com/jwks";
      process.env.AUTH_ISSUER = "https://example.com";
      process.env.AUTH_AUDIENCE = "test-audience";

      const config = loadAuthConfig();

      expect(config.jwksUri).toBe("https://example.com/jwks");
      expect(config.issuer).toBe("https://example.com");
      expect(config.audience).toBe("test-audience");
    });

    it("should throw error when required auth variables are missing", () => {
      delete process.env.AUTH_JWKS_URI;
      delete process.env.AUTH_ISSUER;
      delete process.env.AUTH_AUDIENCE;

      expect(() => loadAuthConfig()).toThrow(
        "Missing required auth configuration"
      );
    });

    it("should use defaults for optional configuration", () => {
      process.env.AUTH_JWKS_URI = "https://example.com/jwks";
      process.env.AUTH_ISSUER = "https://example.com";
      process.env.AUTH_AUDIENCE = "test-audience";

      const config = loadAuthConfig();

      expect(config.cacheTtl).toBe(600);
      expect(config.roleClaimPath).toBe("roles");
      expect(config.requireHttps).toBe(false); // NODE_ENV not set to production
    });

    it("should parse custom permission mapping from environment", () => {
      process.env.AUTH_JWKS_URI = "https://example.com/jwks";
      process.env.AUTH_ISSUER = "https://example.com";
      process.env.AUTH_AUDIENCE = "test-audience";
      process.env.AUTH_PERMISSION_MAPPING = '{"custom-role":["custom:permission"]}';

      const config = loadAuthConfig();

      expect(config.permissionMapping).toEqual({
        "custom-role": ["custom:permission"]
      });
    });
  });
});

describe("AuthService", () => {
  const mockConfig = {
    jwksUri: "https://example.com/jwks",
    issuer: "https://example.com",
    audience: "test-audience",
    cacheTtl: 600,
    roleClaimPath: "roles",
    permissionMapping: {
      admin: ["*"],
      developer: ["k8s:view", "k8s:restart"]
    }
  };

  it("should create AuthService with valid config", () => {
    expect(() => new AuthService(mockConfig)).not.toThrow();
  });

  // Note: Additional tests for token validation would require more complex mocking
  // of the JWT library and JWKS client, which is beyond the scope of this basic test
});
