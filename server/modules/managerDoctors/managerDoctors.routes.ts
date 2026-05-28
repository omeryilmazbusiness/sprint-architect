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
router.get("/providers", handleListDoctors);
router.post("/doctors", handleCreateDoctor);
router.post("/providers", handleCreateDoctor);
router.put("/doctors/:id", handleUpdateDoctor);
router.put("/providers/:id", handleUpdateDoctor);
router.delete("/doctors/:id", handleDeleteDoctor);
router.delete("/providers/:id", handleDeleteDoctor);

export default router;
