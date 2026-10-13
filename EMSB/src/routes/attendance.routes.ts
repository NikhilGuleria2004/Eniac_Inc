import { Router } from "express";
import { attendanceController } from "../controllers/attendance.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const attendanceViewPermissions: Permission[] = [
  "attendance.view",
  "attendance.view_self"
];

router.get(
  "/",
  requireAnyPermission(...attendanceViewPermissions),
  attendanceController.list
);

router.post(
  "/check-in",
  requirePermission("attendance.mark"),
  attendanceController.checkIn
);

router.post(
  "/check-out",
  requirePermission("attendance.mark"),
  attendanceController.checkOut
);

router.get(
  "/corrections",
  requirePermission("attendance.review"),
  attendanceController.listCorrections
);

router.post(
  "/corrections/:correctionId/:action",
  requirePermission("attendance.review"),
  attendanceController.reviewCorrection
);

router.get(
  "/:employeeId",
  requireAnyPermission(...attendanceViewPermissions),
  attendanceController.getByEmployeeId
);

router.patch(
  "/:attendanceId",
  requireAnyPermission("attendance.correct", "attendance.review"),
  attendanceController.update
);

router.post(
  "/:attendanceId/correction",
  requireAnyPermission(...attendanceViewPermissions),
  attendanceController.requestCorrection
);

export default router;
