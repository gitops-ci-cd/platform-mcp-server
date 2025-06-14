import { Router } from "express";

import healthRoutes from "./healthRoutes.js";
import mcpRoutes from "./mcpRoutes.js";

const router: Router = Router();

// Mount route modules
router.use(healthRoutes);
router.use(mcpRoutes);

export default router;
