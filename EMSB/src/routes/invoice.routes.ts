import { Router } from "express";
import { invoiceController } from "../controllers/invoice.controller.js";
import { analyticsController } from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const viewAll: Permission[] = ["invoice.view_all"];
const createPerm: Permission[] = ["invoice.create"];
const editPerm: Permission[] = ["invoice.edit"];
const sendPerm: Permission[] = ["invoice.send"];

router.get("/kpis", requireAnyPermission("report.view"), analyticsController.invoiceKpis);
router.get("/revenue-trend", requireAnyPermission("report.view"), analyticsController.revenueTrend);
router.get("/top-clients", requireAnyPermission("report.view"), analyticsController.topClients);
router.get("/", requireAnyPermission(...viewAll), invoiceController.list);
router.post("/", requireAnyPermission(...createPerm), invoiceController.create);
router.post("/preview-auto-populate", requireAnyPermission(...viewAll), invoiceController.previewAutoPopulate);
router.get("/overlaps", requireAnyPermission(...viewAll), invoiceController.findOverlaps);
router.get("/:invoiceId", requireAnyPermission(...viewAll), invoiceController.getById);

router.patch("/:invoiceId", requireAnyPermission(...editPerm), invoiceController.update);
router.get("/:invoiceId/pdf", requireAnyPermission(...viewAll), invoiceController.downloadPdf);
router.post("/:invoiceId/line-items", requireAnyPermission(...editPerm), invoiceController.addLineItem);
router.patch("/:invoiceId/line-items/:lineItemId", requireAnyPermission(...editPerm), invoiceController.updateLineItem);
router.delete("/:invoiceId/line-items/:lineItemId", requireAnyPermission(...editPerm), invoiceController.removeLineItem);
router.post("/:invoiceId/line-items/reorder", requireAnyPermission(...editPerm), invoiceController.reorderLineItems);

router.post("/:invoiceId/send", requireAnyPermission(...sendPerm), invoiceController.send);
router.post("/:invoiceId/void", requireAnyPermission(...viewAll), invoiceController.void);
router.post("/:invoiceId/mark-paid", requireAnyPermission(...viewAll), invoiceController.markPaid);
router.post("/:invoiceId/payments", requireAnyPermission(...viewAll), invoiceController.recordPayment);

export default router;
