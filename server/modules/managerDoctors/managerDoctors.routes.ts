import { Router } from "express";
import {
  authMiddleware,
  requireRole,
  clinicScopeMiddleware,
  requireActiveClinic,
} from "../../auth/middleware";
import {
  handleListDoctors,
  handleCreateDoctor,
  handleUpdateDoctor,
  handleDeleteDoctor,
} from "./managerDoctors.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware,
);

router.get("/doctors", handleListDoctors);
router.post("/doctors", handleCreateDoctor);
router.put("/doctors/:id", handleUpdateDoctor);
router.delete("/doctors/:id", handleDeleteDoctor);

export default router;
