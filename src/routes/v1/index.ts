import { Router } from "express";

import mcpRoutes from "./mcpRoutes.js";

const router = Router();

// Mount routes
router.use(mcpRoutes);

export default router;
