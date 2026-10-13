import { Router } from "express";
import { documentController } from "../controllers/document.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const documentViewPermissions: Permission[] = [
  "document.view",
  "document.view_self"
];

router.get(
  "/",
  requireAnyPermission(...documentViewPermissions),
  documentController.list
);

router.post(
  "/",
  requireAnyPermission("document.upload", "document.review"),
  documentController.create
);

router.get(
  "/expired",
  requirePermission("report.view"),
  documentController.getExpired
);

router.get(
  "/expiring-soon",
  requirePermission("report.view"),
  documentController.getExpiringSoon
);

router.get(
  "/:documentId",
  requireAnyPermission(...documentViewPermissions),
  documentController.getById
);

router.patch(
  "/:documentId",
  requirePermission("document.review"),
  documentController.update
);

router.post(
  "/:documentId/approve",
  requirePermission("document.review"),
  documentController.approve
);

router.post(
  "/:documentId/reject",
  requirePermission("document.review"),
  documentController.reject
);

router.post(
  "/:documentId/request-changes",
  requirePermission("document.review"),
  documentController.requestChanges
);

export default router;
