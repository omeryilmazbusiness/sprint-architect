import { Router } from "express";
import {
  authMiddleware,
  clinicScopeMiddleware,
  requireActiveClinic,
  requireRole,
} from "../../auth/middleware";
import { getTodayAppointments } from "./managerAppointments.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware,
);

router.get("/", getTodayAppointments);

export default router;
