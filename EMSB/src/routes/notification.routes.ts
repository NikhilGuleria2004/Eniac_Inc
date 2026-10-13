import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("notification.view"),
  notificationController.list
);

router.get(
  "/unread-count",
  requirePermission("notification.view"),
  notificationController.getUnreadCount
);

router.post(
  "/read-all",
  requirePermission("notification.view"),
  notificationController.markAllRead
);

router.post(
  "/:notificationId/read",
  requirePermission("notification.view"),
  notificationController.markRead
);

export default router;
