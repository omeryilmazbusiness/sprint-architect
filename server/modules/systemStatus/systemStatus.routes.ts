import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import { handleGetSystemStatus, handleGetSecurityMetrics } from "./systemStatus.controller";

const router = Router();

router.get(
  "/system/status",
  authMiddleware,
  requireRole("ADMIN"),
  handleGetSystemStatus,
);

router.get(
  "/system/security-metrics",
  authMiddleware,
  requireRole("ADMIN"),
  handleGetSecurityMetrics,
);

export default router;
