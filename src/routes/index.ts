import { Router } from "express";

import healthRoutes from "./healthRoutes.js";
import mcpRoutes from "./mcpRoutes.js";

export const router: Router = Router();

router.use(healthRoutes);
router.use(mcpRoutes);
