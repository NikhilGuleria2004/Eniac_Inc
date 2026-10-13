import { Router } from "express";
import { settingsController } from "../controllers/settings.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("settings.view"), settingsController.getSettings);
router.patch("/", requirePermission("settings.manage"), settingsController.updateSettings);

export default router;
