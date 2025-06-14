import { Router } from "express";

import { authMiddleware } from "../auth/middleware.js";
import healthRoutes from "./healthRoutes.js";
import v1Routes from "./v1/index.js";

const router: Router = Router();

// Public routes (no authentication required)
router.use(healthRoutes);

// Protected /execute routes - auth middleware handles dev/prod mode internally
router.use("/execute", authMiddleware);
router.use("/execute/v1", v1Routes);

export default router;
