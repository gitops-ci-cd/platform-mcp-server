import { Router } from "express";

import v1Routes from "./v1/index.js";

const router: Router = Router();

// Mount versioned routes
router.use("/execute/v1", v1Routes);

export default router;
