import { Router } from "express";
import { leaveController } from "../controllers/leave.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const leaveViewPermissions: Permission[] = ["leave.view", "leave.view_self"];

router.get(
  "/balances",
  requireAnyPermission(...leaveViewPermissions),
  leaveController.getBalances
);

router.get(
  "/balances/:employeeId",
  requireAnyPermission(...leaveViewPermissions),
  leaveController.getBalanceByEmployee
);

router.get(
  "/",
  requireAnyPermission(...leaveViewPermissions),
  leaveController.list
);

router.post(
  "/request",
  requirePermission("leave.request"),
  leaveController.create
);

router.get(
  "/:requestId",
  requireAnyPermission(...leaveViewPermissions),
  leaveController.getById
);

router.post(
  "/:requestId/approve",
  requirePermission("leave.approve"),
  leaveController.approve
);

router.post(
  "/:requestId/reject",
  requirePermission("leave.reject"),
  leaveController.reject
);

export default router;
