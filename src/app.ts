import express, { Express } from "express";
import cors from "cors";

import { loggingMiddleware } from "./logging/index.js";
import { notFoundHandler, errorHandler } from "./controllers/index.js";
import { loadAppConfig } from "./config.js";
import { router } from "./routes/index.js";

export const app: Express = express();
export const config = loadAppConfig();

// Basic middleware (applied to all routes)
app.use(cors(config.cors));
app.use(express.json());
app.use(loggingMiddleware);

app.use(router);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);
