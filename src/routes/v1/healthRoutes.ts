import { Router } from "express";
import { authHealthCheck } from "../../controllers/healthController.js";

const router: Router = Router();

// Authenticated health check (requires auth)
router.get("/health", authHealthCheck);

export default router;
