import { Router } from "express";
import { invitationController } from "../controllers/invitation.controller.js";
import { authRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

// Public endpoints — guarded by the one-time invitation token, not a session.
router.get("/:token", authRateLimiter, invitationController.getByToken);
router.post("/:token/accept", authRateLimiter, invitationController.accept);

export default router;
