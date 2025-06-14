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
  const port = parseInt(process.env.PORT || "8080");
  return {
    port,
    logLevel: LOG_LEVEL,
    cors: {
      origin: process.env.CORS_ORIGINS?.split(",") || [`http://localhost:${port}`],
      credentials: true,
    },
  };
}
