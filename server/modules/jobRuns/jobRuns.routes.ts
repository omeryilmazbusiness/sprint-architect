import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import { handleGetJobStatus } from "./jobRuns.controller";

const router = Router();

router.get(
  "/system/jobs",
  authMiddleware,
  requireRole("ADMIN"),
  handleGetJobStatus,
);

export default router;
