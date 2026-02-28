import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireRole } from "../auth/middleware";
import { getStorageProvider } from "../storage/getStorageProvider";
import { documentRepo } from "../repositories/documentRepo";
import { Errors, AppError } from "../auth/errors";
import { auditLog } from "./auditLogger";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Too many uploads, please try again later." },
});

router.post(
  "/patient/documents/:id/upload",
  authMiddleware,
  requireRole("PATIENT"),
  uploadLimiter,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw Errors.VALIDATION_ERROR("No file uploaded");
      }

      if (req.file.mimetype !== "application/pdf") {
        throw new AppError("FILE_TYPE_INVALID", "Only PDF files are allowed", 422);
      }

      const docId = req.params.id as string;
      const doc = await documentRepo.findById(docId);

      if (!doc) {
        throw Errors.NOT_FOUND("Document not found");
      }

      if (doc.patientId !== req.actor!.sub) {
        throw Errors.FORBIDDEN("You do not have permission to upload this document");
      }

      const storageProvider = getStorageProvider();
      const storageKey = await storageProvider.saveFile({
        clinicId: doc.clinicId,
        patientId: doc.patientId,
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      const updated = await documentRepo.updateDocument(docId, doc.clinicId, {
        fileUrl: storageKey,
        status: "UPLOADED",
        rejectionReason: null,
      });

      auditLog({
        clinicId: doc.clinicId,
        actorId: req.actor!.sub,
        actorRole: req.actor!.role,
        action: "DOCUMENT_UPLOADED",
        resourceType: "patient_document",
        resourceId: docId,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/documents/:id/download",
  (req, res, next) => {
    const tokenFromQuery = req.query.token as string | undefined;
    if (tokenFromQuery && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${tokenFromQuery}`;
    }
    next();
  },
  authMiddleware,
  async (req, res, next) => {
    try {
      const docId = req.params.id as string;
      const doc = await documentRepo.findById(docId);

      if (!doc || !doc.fileUrl) {
        throw Errors.NOT_FOUND("Document or file not found");
      }

      const actor = req.actor!;
      let allowed = false;
      if (actor.role === "ADMIN") {
        allowed = true;
      } else if (actor.role === "MANAGER") {
        allowed = actor.clinicId === doc.clinicId;
      } else if (actor.role === "PATIENT") {
        allowed = actor.sub === doc.patientId;
      }

      if (!allowed) {
        throw Errors.FORBIDDEN();
      }

      const safeName = doc.documentType
        ? `${doc.documentType.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
        : "document.pdf";

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

      const storageProvider = getStorageProvider();
      const stream = await storageProvider.getReadStream(doc.fileUrl);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
