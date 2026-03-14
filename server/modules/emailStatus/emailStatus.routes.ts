import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import { handleGetEmailStatus } from "./emailStatus.controller";

const router = Router();

router.get(
  "/system/email",
  authMiddleware,
  requireRole("ADMIN"),
  handleGetEmailStatus,
);

export default router;
