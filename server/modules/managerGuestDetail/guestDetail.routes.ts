import { Router } from "express";
import {
  authMiddleware,
  requireRole,
  clinicScopeMiddleware,
  requireActiveClinic,
} from "../../auth/middleware";
import { getGuestDetailController, resetDeviceBindingController } from "./guestDetail.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware
);

router.get("/patients/:id/details", getGuestDetailController);
router.post("/patients/:id/reset-device-binding", resetDeviceBindingController);

export default router;
