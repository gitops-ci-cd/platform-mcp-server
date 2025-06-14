import { Router } from "express";

import {
  mcpController,
  handleSessionRequest,
} from "../../controllers/v1/mcpController.js";

const router: Router = Router();

// Modern Streamable HTTP endpoint
// Handle POST requests for client-to-server communication
router.post("/mcp", mcpController);
// Handle GET requests for server-to-client notifications via SSE
router.get("/mcp", handleSessionRequest);
// Handle DELETE requests for session termination
router.delete("/mcp", handleSessionRequest);

export default router;
