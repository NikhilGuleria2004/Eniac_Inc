import { Router } from "express";
import { assignmentController } from "../controllers/assignment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const assignmentViewPermissions: Permission[] = [
  "assignment.view",
  "assignment.view_self"
];
const assignmentManagePermissions: Permission[] = [
  "assignment.create",
  "assignment.edit"
];

router.get(
  "/employee/:employeeId/allocation",
  requireAnyPermission(...assignmentViewPermissions),
  assignmentController.getAllocation
);

router.get(
  "/",
  requireAnyPermission(...assignmentViewPermissions),
  assignmentController.list
);

router.post(
  "/",
  requireAnyPermission(...assignmentManagePermissions),
  assignmentController.create
);

router.get(
  "/:assignmentId",
  requireAnyPermission(...assignmentViewPermissions),
  assignmentController.getById
);

router.patch(
  "/:assignmentId",
  requireAnyPermission(...assignmentManagePermissions),
  assignmentController.update
);

router.post(
  "/:assignmentId/end",
  requireAnyPermission(...assignmentManagePermissions),
  assignmentController.end
);

export default router;
