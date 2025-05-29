import express, { Express, RequestHandler, ErrorRequestHandler } from "express";

import { loggingMiddleware } from "./middleware/loggingMiddleware.js";
import { notFoundHandler } from "./middleware/notFoundHandler.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app: Express = express();

// Middleware stack
const stack: (RequestHandler | ErrorRequestHandler)[] = [
  express.json(),
  loggingMiddleware,
  routes,
  notFoundHandler,
  errorHandler,
];

// Attach each middleware in the stack to the app
stack.forEach((middleware) => app.use(middleware));

export default app;
