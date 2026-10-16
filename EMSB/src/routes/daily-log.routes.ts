import { Router } from "express";
import { dailyLogController } from "../controllers/daily-log.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const dailyLogViewPermissions: Permission[] = [
  "daily_log.view",
  "daily_log.view_all"
];
const dailyLogManagePermissions: Permission[] = [
  "daily_log.create"
];

router.get(
  "/",
  requireAnyPermission(...dailyLogViewPermissions),
  dailyLogController.list
);

router.post(
  "/",
  requireAnyPermission(...dailyLogManagePermissions),
  dailyLogController.create
);

router.get(
  "/:dailyLogId",
  requireAnyPermission(...dailyLogViewPermissions),
  dailyLogController.getById
);

router.patch(
  "/:dailyLogId",
  requireAnyPermission(...dailyLogManagePermissions),
  dailyLogController.update
);

router.delete(
  "/:dailyLogId",
  requireAnyPermission(...dailyLogManagePermissions),
  dailyLogController.remove
);

export default router;
