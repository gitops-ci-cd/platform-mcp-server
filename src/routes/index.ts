import { Router } from "express";

import { createEntraAuthMiddleware } from "../auth/entra.js";
import healthRoutes from "./healthRoutes.js";
import v1Routes from "./v1/index.js";

const router: Router = Router();

// Create Entra ID authentication middleware
const entraAuthMiddleware = createEntraAuthMiddleware();

// Public routes (no authentication required)
router.use(healthRoutes);

// Protected /execute routes (requires authentication)
router.use("/execute", entraAuthMiddleware);
router.use("/execute/v1", v1Routes);

export default router;
