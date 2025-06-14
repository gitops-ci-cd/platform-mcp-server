import { Router } from "express";

import { AuthService, getAuthConfig } from "../auth/index.js";
import healthRoutes from "./healthRoutes.js";
import v1Routes from "./v1/index.js";

const router: Router = Router();

// Create auth service for protected routes
const authConfig = getAuthConfig();
const authService = new AuthService(authConfig);

// Public routes (no authentication required)
router.use(healthRoutes);

// Protected /execute routes (requires authentication)
router.use("/execute", authService.middleware());
router.use("/execute/v1", v1Routes);

export default router;
