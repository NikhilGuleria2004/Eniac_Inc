import { Router } from "express";
import { employeeController } from "../controllers/employee.controller.js";
import { compensationController } from "../controllers/compensation.controller.js";
import { timesheetController } from "../controllers/timesheet.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const employeeViewPermissions: Permission[] = [
  "employee.view",
  "employee.view_operational",
  "profile.view_self"
];
const employeeEditPermissions: Permission[] = [
  "employee.edit",
  "profile.edit_self"
];
const lifecyclePermissions: Permission[] = [
  "employee.edit",
  "employee.delete",
  "employee.activate"
];
const timesheetProvisionPermissions: Permission[] = [
  "timesheet.provision",
  "timesheet.view"
];
const compensationViewPermissions: Permission[] = [
  "compensation.view",
  "employee.view_salary"
];
const compensationManagePermissions: Permission[] = [
  "compensation.manage",
  "employee.edit_salary"
];

router.get(
  "/",
  requireAnyPermission("employee.view", "employee.view_operational"),
  employeeController.list
);

router.post(
  "/",
  requireAnyPermission("employee.create", "employee.view_operational"),
  employeeController.create
);

router.get(
  "/:employeeId/compensation",
  requireAnyPermission(...compensationViewPermissions),
  compensationController.get
);

router.get(
  "/:employeeId/compensation/salary-history",
  requireAnyPermission(...compensationViewPermissions),
  compensationController.getSalaryHistory
);

router.get(
  "/:employeeId/compensation/bill-rate-history",
  requireAnyPermission(...compensationViewPermissions),
  compensationController.getBillRateHistory
);

router.patch(
  "/:employeeId/compensation",
  requireAnyPermission(...compensationManagePermissions),
  compensationController.update
);

router.get(
  "/:employeeId",
  requireAnyPermission(...employeeViewPermissions),
  employeeController.getById
);

router.patch(
  "/:employeeId",
  requireAnyPermission(...employeeEditPermissions),
  employeeController.update
);

router.delete(
  "/:employeeId",
  requireAnyPermission("employee.delete"),
  employeeController.delete
);

router.patch(
  "/:employeeId/billing-status",
  requireAnyPermission("employee.edit", "employee.edit_bill_rate"),
  employeeController.updateBillingStatus
);

router.post(
  "/:employeeId/:action",
  requireAnyPermission(...lifecyclePermissions),
  employeeController.lifecycleAction
);

router.get(
  "/:employeeId/timesheet",
  requireAnyPermission(...timesheetProvisionPermissions),
  timesheetController.getStatus
);

router.post(
  "/:employeeId/timesheet/provision",
  requireAnyPermission("timesheet.provision"),
  timesheetController.provision
);

router.post(
  "/:employeeId/timesheet/disable",
  requireAnyPermission("timesheet.provision"),
  timesheetController.disable
);

export default router;
