// Export MCP SDK-based authentication with MS Entra ID
export { EntraTokenVerifier } from "./tokenVerifier.js";

// Export user info utilities
export {
  getUserFromAuthInfo,
  getUserInfo,
  type AuthenticatedUser,
} from "./user.js";

// Export authentication middleware
export { authMiddleware } from "./middleware.js";
