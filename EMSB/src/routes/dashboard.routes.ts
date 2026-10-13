import { Router } from "express";
import { dashboardController } from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", dashboardController.getDashboard);

router.get("/admin", requireRole("ADMIN"), dashboardController.getAdminDashboard);

router.get("/hr", requireRole("HR"), dashboardController.getHRDashboard);

router.get("/manager", requireRole("MANAGER"), dashboardController.getManagerDashboard);

router.get("/supervisor", requireRole("SUPERVISOR"), dashboardController.getSupervisorDashboard);

router.get("/employee", requireRole("EMPLOYEE"), dashboardController.getEmployeeDashboard);

export default router;
