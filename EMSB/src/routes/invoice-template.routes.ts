import { Router } from "express";
import { invoiceTemplateController } from "../controllers/invoice-template.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const managePermissions: Permission[] = ["invoice.edit", "settings.manage"];

router.get("/", requireAnyPermission(...managePermissions), invoiceTemplateController.list);
router.get("/:invoiceTemplateId", requireAnyPermission(...managePermissions), invoiceTemplateController.getById);
router.post("/", requireAnyPermission(...managePermissions), invoiceTemplateController.create);
router.patch("/:invoiceTemplateId", requireAnyPermission(...managePermissions), invoiceTemplateController.update);
router.post("/:invoiceTemplateId/default", requireAnyPermission("settings.manage"), invoiceTemplateController.setDefault);

export default router;
