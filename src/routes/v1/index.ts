import { Router } from "express";

import mcpRoutes from "./mcpRoutes.js";

const router: Router = Router();

// Mount route modules
router.use(mcpRoutes);

export default router;
