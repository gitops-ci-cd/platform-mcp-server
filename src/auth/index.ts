export * from "./config.js";
export * from "./service.js";

// Re-export commonly used types and functions at module level
export type { AuthConfig, AuthenticatedUser, JWTPayload } from "./config.js";
export { getAuthConfig } from "./config.js";
