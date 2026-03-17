import { Router } from "express";
import {
  authMiddleware,
  requireRole,
  clinicScopeMiddleware,
  requireActiveClinic,
} from "../../auth/middleware";
import { getGuestDetailController } from "./guestDetail.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware
);

router.get("/patients/:id/details", getGuestDetailController);

export default router;
