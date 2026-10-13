import { Router } from "express";
import { projectController } from "../controllers/project.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const projectViewPermissions: Permission[] = ["project.view", "project.view_self"];
const projectManagePermissions: Permission[] = ["project.create", "project.edit"];

router.get(
  "/",
  requireAnyPermission(...projectViewPermissions),
  projectController.list
);

router.post(
  "/",
  requireAnyPermission(...projectManagePermissions),
  projectController.create
);

router.get(
  "/:projectId",
  requireAnyPermission(...projectViewPermissions),
  projectController.getById
);

router.patch(
  "/:projectId",
  requireAnyPermission(...projectManagePermissions),
  projectController.update
);

router.post(
  "/:projectId/activate",
  requireAnyPermission(...projectManagePermissions),
  projectController.activate
);

router.post(
  "/:projectId/complete",
  requireAnyPermission(...projectManagePermissions),
  projectController.complete
);

router.post(
  "/:projectId/archive",
  requireAnyPermission(...projectManagePermissions),
  projectController.archive
);

export default router;
