import { AsyncLocalStorage } from "async_hooks";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

interface RequestContext {
  info: AuthInfo | undefined; // AuthInfo from MCP SDK, required for authenticated requests
  sessionId?: string;
}

// AsyncLocalStorage to maintain request context across async operations
const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Set the authenticated user and session context for the current async execution
 * This should be called at the beginning of each request
 */
export const setRequestContext = ({ info, sessionId }: RequestContext): void => {
  requestContext.enterWith({ info, sessionId });
};

/**
 * Get the current authenticated user from async context and log the operation
 * @param operation - Description of the operation being performed (required)
 * @returns The authenticated user
 */
export const getCurrentUser = (operation: string): AuthInfo => {
  const info = getCurrentUserSilent();

  // Always log the operation
  console.info(`User ${info.extra!.email} (${operation})`);

  return info;
};

/**
 * Get the current authenticated user from async context without logging
 * This should only be used in rare cases where logging is handled elsewhere
 * @returns The authenticated user
 */
export const getCurrentUserSilent = (): AuthInfo => {
  const context = requestContext.getStore();
  if (!context) {
    throw new Error("No request context available. This should only be called within an authenticated request.");
  }

  return context.info!;
};

/**
 * Get the current session ID from async context
 * @returns The session ID, or throws if no context or session available
 */
export const getCurrentSessionId = (): string => {
  const context = requestContext.getStore();
  if (!context) {
    throw new Error("No request context available. This should only be called within an authenticated request.");
  }
  if (!context.sessionId) {
    throw new Error("No session ID available. This is expected only during initial connection before session is established.");
  }

  return context.sessionId;
};

export const getCurrentUserToken = (): string | undefined => {
  const context = requestContext.getStore();
  if (!context) {
    throw new Error("No request context available. This should only be called within an authenticated request.");
  }

  return context.info!.token;
};
