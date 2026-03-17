import { Router } from "express";
import {
  authMiddleware,
  requireRole,
  clinicScopeMiddleware,
  requireActiveClinic,
} from "../../auth/middleware";
import { handleListPatients, handleApprovePatient } from "./managerPatients.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware,
);

router.get("/patients", handleListPatients);
router.post("/patients/:id/approve", handleApprovePatient);

export default router;
