import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import {
  handleGetPatientSummary,
  handleDeactivatePatient,
  handleRegenerateAccessKey,
} from "./adminPatients.controller";

const router = Router();

router.get(
  "/patients/:id",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleGetPatientSummary,
);

router.post(
  "/patients/:id/deactivate",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleDeactivatePatient,
);

router.post(
  "/patients/:id/regenerate-access-key",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  handleRegenerateAccessKey,
);

export default router;
