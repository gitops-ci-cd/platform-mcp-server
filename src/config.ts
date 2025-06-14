import { LOG_LEVEL } from "./lib/logging/index.js";

export interface AppConfig {
  port: number;
  logLevel: string;
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

export function loadAppConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || "8080"),
    logLevel: LOG_LEVEL,
    cors: {
      origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
      credentials: true,
    },
  };
}
