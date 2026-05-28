import { Router } from "express";
import { authMiddleware, requireRole } from "../../auth/middleware";
import {
  handleGetPatientSummary,
  handleDeactivatePatient,
  handleRegenerateAccessKey,
} from "./adminPatients.controller";

const router = Router();

const memberSummary = [
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleGetPatientSummary,
] as const;

router.get("/patients/:id", ...memberSummary);
router.get("/members/:id", ...memberSummary);

router.post(
  "/patients/:id/deactivate",
  authMiddleware,
  requireRole("ADMIN", "SUPER_ADMIN"),
  handleDeactivatePatient,
);
router.post(
  "/members/:id/deactivate",
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
router.post(
  "/members/:id/regenerate-access-key",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  handleRegenerateAccessKey,
);

export default router;
