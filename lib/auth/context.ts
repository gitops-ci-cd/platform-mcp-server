import { AsyncLocalStorage } from "async_hooks";
import type { AuthenticatedUser } from "./user.js";

interface RequestContext {
  user: AuthenticatedUser;
  sessionId?: string;
}

// AsyncLocalStorage to maintain request context across async operations
const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Set the authenticated user and session context for the current async execution
 * This should be called at the beginning of each request
 */
export const setRequestContext = ({ user, sessionId }: RequestContext): void => {
  requestContext.enterWith({ user, sessionId });
};

/**
 * Get the current authenticated user from async context and log the operation
 * @param operation - Description of the operation being performed (required)
 * @returns The authenticated user
 */
export const getCurrentUser = (operation: string): AuthenticatedUser => {
  const user = getCurrentUserSilent();

  // Always log the operation
  console.info(`User ${user.email} (${operation})`);

  return user;
};

/**
 * Get the current authenticated user from async context without logging
 * This should only be used in rare cases where logging is handled elsewhere
 * @returns The authenticated user
 */
export const getCurrentUserSilent = (): AuthenticatedUser => {
  const context = requestContext.getStore();
  if (!context) {
    throw new Error("No request context available. This should only be called within an authenticated request.");
  }
  return context.user;
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
