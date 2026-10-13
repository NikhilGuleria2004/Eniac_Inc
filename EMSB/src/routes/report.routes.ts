import { Router } from "express";
import { reportController } from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("report.view"), reportController.getReportDefinitions);

router.get("/:reportId", requirePermission("report.view"), reportController.generateReport);

export default router;
