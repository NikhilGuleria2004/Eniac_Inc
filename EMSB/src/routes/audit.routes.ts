import { Router } from "express";
import { auditController } from "../controllers/audit.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("audit.view"),
  auditController.list
);

router.get(
  "/:auditId",
  requirePermission("audit.view"),
  auditController.getById
);

export default router;
