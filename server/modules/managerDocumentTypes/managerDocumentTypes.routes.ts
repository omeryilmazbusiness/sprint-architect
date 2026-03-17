import { Router } from "express";
import {
  listDocumentTypes,
  createDocumentType,
  deleteDocumentType,
} from "./managerDocumentTypes.controller";

const router = Router();

router.get("/", listDocumentTypes);
router.post("/", createDocumentType);
router.delete("/:id", deleteDocumentType);

export { router as managerDocumentTypesRouter };
