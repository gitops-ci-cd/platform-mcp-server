import { Router } from "express";
import { healthCheck } from "../controllers/index.js";

const router: Router = Router();

// Public health check (no authentication required)
router.get("/health", healthCheck);

export default router;
