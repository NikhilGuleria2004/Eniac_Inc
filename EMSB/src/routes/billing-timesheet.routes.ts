import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { billingTimesheetController } from "../controllers/billing-timesheet.controller.js";
import { analyticsController } from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission, requirePermission } from "../middleware/authorization.middleware.js";
import { AuthorizationError } from "../utils/errors.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

// The billing-timesheet module is CMS-only. `timesheet.view` is shared with the
// EMS timesheet-provisioning endpoint (GET /employees/:id/timesheet), which HR
// retains, so HR is rejected here at the module boundary instead of by permission.
router.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role === "HR") {
    throw new AuthorizationError("The HR role has no access to CMS timesheets.");
  }
  next();
});

const viewPermissions: Permission[] = ["timesheet.view", "timesheet.view_all"];
const reviewPermissions: Permission[] = ["timesheet.approve", "timesheet.reject"];

router.get("/kpis", requireAnyPermission("report.view"), analyticsController.timesheetKpis);
router.get("/submission-rate", requireAnyPermission("report.view"), analyticsController.submissionRate);
router.get("/", requireAnyPermission(...viewPermissions), billingTimesheetController.list);
router.get("/mine", requirePermission("timesheet.view"), billingTimesheetController.mine);
router.post("/", requirePermission("timesheet.view_all"), billingTimesheetController.createManual);
router.post("/compile", requirePermission("timesheet.submit"), billingTimesheetController.compile);
router.get("/:timesheetId", requireAnyPermission(...viewPermissions), billingTimesheetController.getById);
router.post("/:timesheetId/submit", requirePermission("timesheet.submit"), billingTimesheetController.submit);
router.post("/:timesheetId/approve", requireAnyPermission(...reviewPermissions), billingTimesheetController.approve);
router.post("/:timesheetId/reject", requireAnyPermission(...reviewPermissions), billingTimesheetController.reject);
router.post("/:timesheetId/revise", requirePermission("timesheet.submit"), billingTimesheetController.revise);
router.post("/:timesheetId/mark-paid", requirePermission("timesheet.view_all"), billingTimesheetController.markPaid);

export default router;
