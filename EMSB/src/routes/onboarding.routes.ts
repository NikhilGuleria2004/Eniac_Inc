import { Router } from "express";
import { onboardingController } from "../controllers/onboarding.controller.js";
import { invitationController } from "../controllers/invitation.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission, requireAnyPermission } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", requireAnyPermission("onboarding.manage", "employee.view"), onboardingController.list);
router.post("/", requirePermission("onboarding.manage"), onboardingController.create);

router.get("/:employeeId", requireAnyPermission("onboarding.manage", "employee.view", "profile.view_self"), onboardingController.getById);
router.patch("/:employeeId", requirePermission("onboarding.manage"), onboardingController.update);

router.post("/:employeeId/submit", requireAnyPermission("onboarding.manage", "profile.edit_self"), onboardingController.submit);
router.post("/:employeeId/review", requirePermission("onboarding.manage"), onboardingController.review);
router.post("/:employeeId/approve", requirePermission("onboarding.manage"), onboardingController.approve);
router.post("/:employeeId/reject", requirePermission("onboarding.manage"), onboardingController.reject);
router.post("/:employeeId/activate", requirePermission("onboarding.manage"), onboardingController.activate);
router.post("/:employeeId/invite", requirePermission("onboarding.manage"), invitationController.create);

export default router;
