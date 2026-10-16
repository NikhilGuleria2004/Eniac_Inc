import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const reportPermissions: Permission[] = ["report.view"];

router.get("/overview", requireAnyPermission(...reportPermissions), analyticsController.overview);

export default router;
