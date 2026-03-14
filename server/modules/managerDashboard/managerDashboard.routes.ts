import { Router } from "express";
import {
  authMiddleware,
  clinicScopeMiddleware,
  requireActiveClinic,
  requireRole,
} from "../../auth/middleware";
import { getManagerDashboard } from "./managerDashboard.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware,
);

router.get("/", getManagerDashboard);

export default router;
