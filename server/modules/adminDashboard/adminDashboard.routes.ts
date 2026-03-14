import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import { getDashboardOverview } from "./adminDashboard.controller";

const router = Router();

router.get(
  "/dashboard",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  getDashboardOverview,
);

export default router;
