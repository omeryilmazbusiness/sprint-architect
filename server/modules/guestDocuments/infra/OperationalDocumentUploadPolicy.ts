import { AppError } from "../../../auth/errors";
import type { GuestUploadContext, IDocumentUploadPolicy } from "../ports/IDocumentUploadPolicy";

/**
 * Guest may upload only PDFs for document assignments created by their institution.
 * Authorization = manager assigned this document type to the guest (not a global allowlist).
 */
export class OperationalDocumentUploadPolicy implements IDocumentUploadPolicy {
  private readonly maxBytes: number;

  constructor(maxBytes = 10 * 1024 * 1024) {
    this.maxBytes = maxBytes;
  }

  assertAllowed(ctx: GuestUploadContext): void {
    const ext = ctx.originalName.split(".").pop()?.toLowerCase() ?? "";
    if (ctx.mimeType !== "application/pdf" || ext !== "pdf") {
      throw new AppError(
        "DOC-UP-001",
        "Only PDF files are accepted (application/pdf, .pdf extension)",
        422
      );
    }

    if (ctx.fileSizeBytes > this.maxBytes) {
      throw new AppError("DOC-UP-002", "File exceeds the 10 MB limit", 413);
    }

    if (ctx.documentPatientId !== ctx.patientId) {
      throw new AppError("DOC-UP-003", "You are not the owner of this document", 403);
    }

    if (!ctx.isAssignedToGuest) {
      throw new AppError("DOC-UP-004", "This file request is not assigned to you", 403);
    }

    if (ctx.retentionPurgedAt) {
      throw new AppError("DOC-UP-410", "Guest data has been removed", 410);
    }

    if (ctx.scheduledPurgeAt && Date.now() >= ctx.scheduledPurgeAt.getTime()) {
      throw new AppError("DOC-UP-410", "Upload period has ended for this guest", 410);
    }

    if (!["ASSIGNED", "REJECTED"].includes(ctx.documentStatus)) {
      throw new AppError("DOC-UP-005", "This file is not available for upload", 409);
    }
  }
}

export const operationalDocumentUploadPolicy = new OperationalDocumentUploadPolicy();
