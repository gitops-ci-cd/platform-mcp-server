import { Router } from "express";

import { authMiddleware, userContextMiddleware } from "../../lib/auth/index.js";
import healthRoutes from "./healthRoutes.js";
import mcpRoutes from "./mcpRoutes.js";

export const router: Router = Router();

// Public routes (no authentication required)
router.use(healthRoutes);

router.use(authMiddleware);
router.use(userContextMiddleware);

// Protected routes - auth middleware handles dev/prod mode internally
router.use(mcpRoutes);
