type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export const LOG_LEVEL = process.env.LOG_LEVEL || Object.keys(levels)[levels.info];

// Ensure the log level is valid, default to 'info' if not
const normalizedLogLevel =
  (LOG_LEVEL.toLowerCase() as LogLevel) in levels ? (LOG_LEVEL.toLowerCase() as LogLevel) : "info";

const currentLevel = levels[normalizedLogLevel];

if (currentLevel > levels.debug) {
  console.debug = () => {};
}

if (currentLevel > levels.info) {
  console.info = () => {};
}

if (currentLevel > levels.warn) {
  console.warn = () => {};
}

// Re-export logging middleware for barrel file pattern
export { loggingMiddleware } from "./middleware.js";
