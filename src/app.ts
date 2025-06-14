import express, { Express } from "express";
import cors from "cors";

import { loggingMiddleware } from "./logging/middleware.js";
import { notFoundHandler } from "./controllers/notFoundHandler.js";
import { errorHandler } from "./controllers/errorHandler.js";
import { loadAppConfig } from "./config.js";
import routes from "./routes/index.js";

export const app: Express = express();
export const config = loadAppConfig();

// Basic middleware (applied to all routes)
app.use(cors(config.cors));
app.use(express.json());
app.use(loggingMiddleware);

app.use(routes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
