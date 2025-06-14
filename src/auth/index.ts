// Export MCP SDK-based authentication with MS Entra ID
export {
  createEntraAuthMiddleware,
  getUserFromAuthInfo,
  type McpAuthenticatedUser,
} from "./entra.js";

// Re-export MCP SDK auth types for convenience
export type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
