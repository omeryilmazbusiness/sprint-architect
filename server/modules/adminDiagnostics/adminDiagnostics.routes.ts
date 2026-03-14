import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import { handleGetDiagnostics } from "./adminDiagnostics.controller";

const router = Router();

router.get(
  "/diagnostics",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleGetDiagnostics,
);

export default router;
