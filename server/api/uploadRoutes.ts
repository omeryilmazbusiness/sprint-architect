import { Router } from "express";
import multer from "multer";
import path from "path";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireRole } from "../auth/middleware";
import { storageProvider } from "../storage/LocalDiskStorageProvider";
import { documentRepo } from "../repositories/documentRepo";
import { Errors, AppError } from "../auth/errors";
import { auditLog } from "./auditLogger";
import { verifyAccessToken } from "../auth/jwt";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Too many uploads, please try again later." },
});

// POST /patient/documents/:id/upload
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

      // Verify ownership
      if (doc.patientId !== req.actor!.sub) {
        throw Errors.FORBIDDEN("You do not have permission to upload this document");
      }

      const fileUrl = await storageProvider.saveFile({
        clinicId: doc.clinicId,
        patientId: doc.patientId,
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      });

      const updated = await documentRepo.updateDocument(docId, doc.clinicId, {
        fileUrl,
        status: "UPLOADED",
        rejectionReason: null,
      });

      auditLog({
        clinicId: doc.clinicId,
        actorId: req.actor!.sub,
        actorRole: req.actor!.role,
        action: "DOCUMENT_UPLOADED",
        resourceType: "patient_document",
        resourceId: docId as string,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

// GET /documents/:id/download
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
      
      // Auth check:
      // ADMIN: always allowed
      // MANAGER: same clinic
      // PATIENT: must own it
      let allowed = false;
      if (actor.role === "ADMIN") {
        allowed = true;
      } else if (actor.role === "MANAGER") {
        if (actor.clinicId === doc.clinicId) {
          allowed = true;
        }
      } else if (actor.role === "PATIENT") {
        if (actor.sub === doc.patientId) {
          allowed = true;
        }
      }

      if (!allowed) {
        throw Errors.FORBIDDEN();
      }

      const filePath = storageProvider.getFilePath(doc.fileUrl);
      if (!path.isAbsolute(filePath)) {
        // storageProvider.getFilePath returns absolute path, but let's be safe
      }

      res.setHeader("Content-Type", "application/pdf");
      // Use Content-Disposition to suggest a filename
      const filename = `${doc.documentType.name.replace(/\s+/g, "_")}.pdf`;
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
