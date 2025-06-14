import { Router } from "express";

import { mcpController, handleSessionRequest } from "../controllers/index.js";

const router: Router = Router();

// Handle POST requests for client-to-server communication
router.post("/execute", mcpController);
// Handle GET requests for server-to-client notifications via SSE
router.get("/execute", handleSessionRequest);
// Handle DELETE requests for session termination
router.delete("/execute", handleSessionRequest);

export default router;
