import { Router } from "express";
import {
  authMiddleware,
  requireRole,
  requireActiveClinic,
  clinicScopeMiddleware,
} from "../../auth/middleware";
import {
  listDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from "./managerDocumentTypes.controller";

const router = Router();

router.use(
  authMiddleware,
  requireRole("MANAGER", "ADMIN"),
  requireActiveClinic,
  clinicScopeMiddleware,
);

router.get("/", listDocumentTypes);
router.post("/", createDocumentType);
router.put("/:id", updateDocumentType);
router.delete("/:id", deleteDocumentType);

export { router as managerDocumentTypesRouter };
