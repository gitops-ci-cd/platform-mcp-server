import express, { Express } from "express";
import cors from "cors";

import { loggingMiddleware } from "./middleware/loggingMiddleware.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { loadAppConfig } from "./config.js";
import routes from "./routes/index.js";

// Load configuration
const appConfig = loadAppConfig();

const app: Express = express();

// Basic middleware (applied to all routes)
app.use(cors(appConfig.cors));
app.use(express.json());
app.use(loggingMiddleware);

app.use(routes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
