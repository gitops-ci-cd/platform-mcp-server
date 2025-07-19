import { Router } from "express";

import { check } from "../handlers/healthHandler.js";

const router: Router = Router();

// Public health check (no authentication required)
router.get("/health", check);

export default router;
