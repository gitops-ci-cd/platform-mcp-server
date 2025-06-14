import request from "supertest";
import express from "express";
import { AuthService } from "./index.js";

// Mock the auth dependencies for testing
jest.mock("jsonwebtoken");
jest.mock("jwks-client");

describe("Integration: Authentication Middleware", () => {
  let app: express.Application;

  beforeAll(() => {
    // Create a test app with auth middleware
    app = express();
    app.use(express.json());

    // Mock auth config
    const mockAuthConfig = {
      jwksUri: "https://example.com/jwks",
      issuer: "https://example.com",
      audience: "test-audience",
    };

    const authService = new AuthService(mockAuthConfig);

    // Public route (no auth)
    app.get("/health", (req, res) => {
      res.json({ status: "healthy" });
    });

    // Protected route (requires auth)
    app.get("/protected", authService.middleware(), (req, res) => {
      res.json({ message: "authenticated", user: (req as any).user });
    });
  });

  describe("Public Routes", () => {
    it("should allow access to health endpoint without authentication", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "healthy" });
    });
  });

  describe("Protected Routes", () => {
    it("should reject requests without Authorization header", async () => {
      const response = await request(app).get("/protected");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    it("should reject requests with invalid Authorization header", async () => {
      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Invalid token");

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Unauthorized");
    });

    // Note: Testing valid tokens would require more complex JWT mocking
  });
});
