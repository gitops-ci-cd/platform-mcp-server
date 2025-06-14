import { Router } from "express";

import { authMiddleware } from "../auth/middleware.js";
import healthRoutes from "./healthRoutes.js";
import mcpRoutes from "./mcpRoutes.js";

const router: Router = Router();

// Public routes (no authentication required)
router.use(healthRoutes);

router.use(authMiddleware);

// Protected routes - auth middleware handles dev/prod mode internally
router.use(mcpRoutes);

export default router;
