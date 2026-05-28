import { Router } from "express";
import {
  authMiddleware,
  requireRole,
  clinicScopeMiddleware,
  requireActiveClinic,
} from "../../auth/middleware";
import {
  handleListPatients,
  handleApprovePatient,
  handleListDocSummaries,
} from "./managerPatients.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware,
);

router.get("/patients", handleListPatients);
router.get("/members", handleListPatients);
router.post("/patients/:id/approve", handleApprovePatient);
router.post("/members/:id/approve", handleApprovePatient);
router.get("/patients/doc-summaries", handleListDocSummaries);
router.get("/members/doc-summaries", handleListDocSummaries);

export default router;
