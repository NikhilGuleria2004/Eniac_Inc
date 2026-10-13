import { Router } from "express";
import authRoutes from "./auth.routes.js";
import employeeRoutes from "./employee.routes.js";
import onboardingRoutes from "./onboarding.routes.js";
import documentRoutes from "./document.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import leaveRoutes from "./leave.routes.js";
import clientRoutes from "./client.routes.js";
import projectRoutes from "./project.routes.js";
import assignmentRoutes from "./assignment.routes.js";
import reviewRoutes from "./review.routes.js";
import notificationRoutes from "./notification.routes.js";
import auditRoutes from "./audit.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import reportRoutes from "./report.routes.js";
import settingsRoutes from "./settings.routes.js";
import invitationRoutes from "./invitation.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/documents", documentRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/leave", leaveRoutes);
router.use("/clients", clientRoutes);
router.use("/projects", projectRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/audit-log", auditRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/reports", reportRoutes);
router.use("/settings", settingsRoutes);
router.use("/invitations", invitationRoutes);

router.get("/", (_req, res) => {
  res.json({
    success: true,
    data: {
      name: "Eniac Inc. Employee Management System API",
      version: "1.0.0"
    }
  });
});

export default router;
