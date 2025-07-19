import { Router } from "express";

import { httpHandler, sessionHandler } from "../handlers/mcpHTTPHandler.js";

const router: Router = Router();

// Handle POST requests for client-to-server communication
router.post("/execute", httpHandler);
// Handle GET requests for server-to-client notifications via SSE
router.get("/execute", sessionHandler);
// Handle DELETE requests for session termination
router.delete("/execute", sessionHandler);

export default router;
