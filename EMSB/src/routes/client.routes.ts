import { Router } from "express";
import { clientController } from "../controllers/client.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { requirePermission } from "../middleware/authorization.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("client.view"), clientController.list);
router.post("/", requirePermission("client.create"), clientController.create);

router.get("/:clientId", requirePermission("client.view"), clientController.getById);
router.patch("/:clientId", requirePermission("client.edit"), clientController.update);
router.post("/:clientId/deactivate", requirePermission("client.edit"), clientController.deactivate);

export default router;
