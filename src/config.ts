export interface AppConfig {
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
}

export function loadAppConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT || "8080"),
    cors: {
      origin: process.env.CORS_ORIGINS?.split(",") || ["http://localhost:3000"],
      credentials: true,
    },
  };
}
