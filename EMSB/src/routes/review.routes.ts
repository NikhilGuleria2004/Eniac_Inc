import { Router } from "express";
import { reviewController } from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requireAnyPermission } from "../middleware/authorization.middleware.js";
import type { Permission } from "../permissions/permissions.js";

const router = Router();

router.use(authenticate);

const reviewViewPermissions: Permission[] = [
  "review.view",
  "review.view_self"
];
const reviewManagePermissions: Permission[] = [
  "review.create",
  "review.edit"
];

router.get(
  "/",
  requireAnyPermission(...reviewViewPermissions),
  reviewController.list
);

router.post(
  "/",
  requireAnyPermission(...reviewManagePermissions),
  reviewController.create
);

router.get(
  "/:reviewId",
  requireAnyPermission(...reviewViewPermissions),
  reviewController.getById
);

router.patch(
  "/:reviewId",
  requireAnyPermission(...reviewManagePermissions),
  reviewController.update
);

router.post(
  "/:reviewId/submit",
  requireAnyPermission(...reviewManagePermissions),
  reviewController.submit
);

router.post(
  "/:reviewId/complete",
  requireAnyPermission(...reviewManagePermissions),
  reviewController.complete
);

export default router;
