import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { authMiddleware, requireRole } from "../auth/middleware";
import { signAccessToken } from "../auth/jwt";
import { AppError } from "../auth/errors";
import { auditLog } from "./auditLogger";
import { uploadGuestDocument } from "../modules/guestDocuments";
import { documentRepo } from "../repositories/documentRepo";
import { getStorageProvider } from "../storage/getStorageProvider";
import { db } from "../db";
import { patientDocuments } from "@shared/schema";

const router = Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
}).single("file");

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Too many uploads, please try again later." },
});

function multerUpload(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (!err) return resolve();
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return reject(new AppError("DOC-UP-002", "File exceeds the 10 MB limit", 413));
      }
      reject(err);
    });
  });
}

router.post(
  "/patient/documents/:id/upload",
  authMiddleware,
  requireRole("PATIENT"),
  uploadLimiter,
  async (req, res, next) => {
    try {
      await multerUpload(req, res);

      if (!req.file) {
        throw new AppError("DOC-UP-001", "No file received", 400);
      }

      const docId = req.params.id as string;
      const result = await uploadGuestDocument.execute({
        patientId: req.actor!.sub,
        documentId: docId,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname ?? "",
        fileSizeBytes: req.file.size,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/documents/:id/signed-url",
  authMiddleware,
  async (req, res, next) => {
    try {
      const docId = req.params.id as string;
      const doc = await documentRepo.findById(docId);

      if (!doc || !doc.fileUrl) {
        throw new AppError("DOC-UP-404", "Document or file not found", 404);
      }

      const actor = req.actor!;
      let allowed = false;
      if (actor.role === "ADMIN") allowed = true;
      else if (actor.role === "MANAGER") allowed = actor.clinicId === doc.clinicId;
      else if (actor.role === "PATIENT") allowed = actor.sub === doc.patientId;

      if (!allowed) throw new AppError("DOC-UP-003", "Access denied", 403);

      const downloadToken = signAccessToken({
        sub: actor.sub,
        role: actor.role,
        clinicId: actor.clinicId,
        type: actor.type,
      });

      const downloadUrl = `/v1/documents/${docId}/download?token=${downloadToken}`;
      res.json({
        url: downloadUrl,
        fileName: doc.fileName ?? `document.pdf`,
        expiresIn: 900,
      });
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
        throw new AppError("DOC-UP-404", "Document or file not found", 404);
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
        throw new AppError("DOC-UP-003", "Access denied", 403);
      }

      const safeName = doc.fileName
        ? doc.fileName.replace(/[^a-zA-Z0-9_\-\.]/g, "_")
        : doc.documentType
        ? `${doc.documentType.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
        : "document.pdf";

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
      if (doc.fileSize) {
        res.setHeader("Content-Length", doc.fileSize);
      }

      const storageProvider = getStorageProvider();
      const stream = await storageProvider.getReadStream(doc.fileUrl);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/patient/documents/:id/file",
  authMiddleware,
  requireRole("PATIENT"),
  async (req, res, next) => {
    try {
      const docId = req.params.id as string;
      const doc = await documentRepo.findById(docId);

      if (!doc) {
        throw new AppError("DOC-RM-404", "Document not found", 404);
      }

      if (doc.patientId !== req.actor!.sub) {
        throw new AppError("DOC-RM-403", "You are not the owner of this document", 403);
      }

      if (!doc.fileUrl) {
        throw new AppError("DOC-RM-400", "No file is attached to this document", 400);
      }

      const storageProvider = getStorageProvider();
      await storageProvider.deleteFile(doc.fileUrl);

      const updated = await documentRepo.updateDocument(docId, doc.clinicId, {
        fileUrl: null,
        fileName: null,
        fileMime: null,
        fileSize: null,
        uploadedAt: null,
        status: "ASSIGNED",
        rejectionReason: null,
      });

      auditLog({
        clinicId: doc.clinicId,
        actorId: req.actor!.sub,
        actorRole: req.actor!.role,
        action: "DOCUMENT_FILE_REMOVED",
        resourceType: "patient_document",
        resourceId: docId,
      });

      res.json({
        id: updated.id,
        status: updated.status,
        fileUrl: null,
        fileName: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
