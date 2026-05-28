import { AppError } from "../../../auth/errors";
import { auditLog } from "../../../api/auditLogger";
import { documentRepo } from "../../../repositories/documentRepo";
import { notificationService } from "../../../services/NotificationService";
import { getStorageProvider } from "../../../storage/getStorageProvider";
import { db } from "../../../db";
import { patients } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { IDocumentUploadPolicy } from "../ports/IDocumentUploadPolicy";
import { operationalDocumentUploadPolicy } from "../infra/OperationalDocumentUploadPolicy";

export interface UploadGuestDocumentInput {
  patientId: string;
  documentId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  fileSizeBytes: number;
}

export interface UploadGuestDocumentResult {
  id: string;
  status: string;
  fileName: string | null;
  fileMime: string | null;
  fileSize: number | null;
  uploadedAt: Date | null;
}

export class UploadGuestDocument {
  constructor(private readonly policy: IDocumentUploadPolicy = operationalDocumentUploadPolicy) {}

  async execute(input: UploadGuestDocumentInput): Promise<UploadGuestDocumentResult> {
    const doc = await documentRepo.findById(input.documentId);
    if (!doc) {
      throw new AppError("DOC-UP-404", "Document assignment not found", 404);
    }

    const guest = await db.query.patients.findFirst({
      where: eq(patients.id, input.patientId),
      columns: {
        id: true,
        scheduledPurgeAt: true,
        retentionPurgedAt: true,
      },
    });

    this.policy.assertAllowed({
      mimeType: input.mimeType,
      originalName: input.originalName,
      fileSizeBytes: input.fileSizeBytes,
      documentStatus: doc.status,
      patientId: input.patientId,
      documentPatientId: doc.patientId,
      isAssignedToGuest: doc.patientId === input.patientId,
      scheduledPurgeAt: guest?.scheduledPurgeAt ?? null,
      retentionPurgedAt: guest?.retentionPurgedAt ?? null,
    });

    const storageKey = await getStorageProvider().saveFile({
      clinicId: doc.clinicId,
      patientId: doc.patientId,
      buffer: input.buffer,
      originalName: input.originalName,
      mimetype: input.mimeType,
    });

    const now = new Date();
    const updated = await documentRepo.updateDocument(input.documentId, doc.clinicId, {
      fileUrl: storageKey,
      fileName: input.originalName,
      fileMime: input.mimeType,
      fileSize: input.fileSizeBytes,
      status: "UPLOADED",
      uploadedAt: now,
      rejectionReason: null,
    });

    auditLog({
      clinicId: doc.clinicId,
      actorId: input.patientId,
      actorRole: "PATIENT",
      action: "DOCUMENT_UPLOADED",
      resourceType: "patient_document",
      resourceId: input.documentId,
    });

    notificationService.emitManagerNotification(doc.clinicId, {
      type: "DOCUMENT_UPLOADED",
      title: "File Uploaded",
      body: `A guest uploaded a file: ${input.originalName}`,
      severity: "INFO",
      relatedId: input.documentId,
      relatedType: "patient_document",
      metadata: { patientId: doc.patientId, fileName: input.originalName },
    }).catch(() => {});

    return {
      id: updated.id,
      status: updated.status,
      fileName: updated.fileName,
      fileMime: updated.fileMime,
      fileSize: updated.fileSize,
      uploadedAt: updated.uploadedAt,
    };
  }
}

export const uploadGuestDocument = new UploadGuestDocument();
