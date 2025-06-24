import { AsyncLocalStorage } from "async_hooks";
import type { AuthenticatedUser } from "./user.js";

// AsyncLocalStorage to maintain user context across async operations
const userContext = new AsyncLocalStorage<AuthenticatedUser>();

/**
 * Set the authenticated user context for the current async execution
 * This should be called at the beginning of each request
 */
export const setUserContext = (user: AuthenticatedUser): void => {
  userContext.enterWith(user);
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
  const user = userContext.getStore();
  if (!user) {
    throw new Error("No user context available. This should only be called within an authenticated request.");
  }
  return user;
};
