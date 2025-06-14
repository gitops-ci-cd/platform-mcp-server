import { Request, Response, NextFunction } from "express";
import { authMiddleware } from "./middleware.js";

// Mock JWKS client (needed because middleware imports EntraTokenVerifier)
jest.mock("jwks-client", () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockImplementation((kid, callback) => {
      callback(null, {
        getPublicKey: () => "mock-public-key"
      });
    })
  }));
});

// Mock jsonwebtoken (needed because middleware imports EntraTokenVerifier)
jest.mock("jsonwebtoken", () => ({
  decode: jest.fn(),
  verify: jest.fn(),
}));

// Mock the MCP SDK bearer auth middleware
jest.mock("@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js", () => ({
  requireBearerAuth: jest.fn().mockReturnValue((req: Request, res: Response, next: NextFunction) => {
    // Mock the MCP SDK middleware behavior
    next();
  }),
}));

describe("Auth Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe("authMiddleware", () => {
    it("should skip authentication in development mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(consoleSpy).toHaveBeenCalledWith("🔓 Development mode: Skipping authentication middleware");
      expect(mockNext).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it("should use MCP SDK auth in production mode", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      // Set up mock environment for EntraTokenVerifier
      process.env.MS_ENTRA_TENANT_ID = "test-tenant";
      process.env.MS_ENTRA_CLIENT_ID = "test-client";

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle undefined NODE_ENV as production", () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      // Set up mock environment for EntraTokenVerifier
      process.env.MS_ENTRA_TENANT_ID = "test-tenant";
      process.env.MS_ENTRA_CLIENT_ID = "test-client";

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
