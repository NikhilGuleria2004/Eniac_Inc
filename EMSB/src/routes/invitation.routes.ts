import { Router } from "express";
import { invitationController } from "../controllers/invitation.controller.js";

const router = Router();

// Public endpoints — guarded by the one-time invitation token, not a session.
// (Deliberately NOT behind authRateLimiter: that limiter is IP+email keyed for
// login/refresh brute-force protection. These endpoints are authenticated by the
// token itself, and their bodies carry no email, so the IP-only fallback would
// 429 all invitees behind a shared NAT/VPN/IP. The global apiRateLimiter still
// guards against flooding; tokens are 32-byte secrets with expiry + single-use.)
router.get("/:token", invitationController.getByToken);
router.post("/:token/accept", invitationController.accept);

export default router;
