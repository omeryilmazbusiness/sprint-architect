import { AppError } from "../../../auth/errors";
import { notificationService } from "../../../services/NotificationService";
import type {
  AssignDocumentItemInput,
  IGuestDocumentAssignmentRepo,
} from "../ports/IGuestDocumentAssignmentRepo";
import { guestDocumentAssignmentRepo } from "../repos/GuestDocumentAssignmentRepo.drizzle";

export interface AssignDocumentsToGuestInput {
  clinicId: string;
  patientId: string;
  items: AssignDocumentItemInput[];
}

export class AssignDocumentsToGuest {
  constructor(private readonly repo: IGuestDocumentAssignmentRepo = guestDocumentAssignmentRepo) {}

  async execute(input: AssignDocumentsToGuestInput) {
    if (!input.items.length) {
      throw new AppError("DOC-ASSIGN-001", "At least one document type is required", 400);
    }

    for (const item of input.items) {
      const docType = await this.repo.findDocumentType(input.clinicId, item.documentTypeId);
      if (!docType) {
        throw new AppError(
          "DOC-ASSIGN-404",
          "One or more document types were not found for this institution",
          404
        );
      }
    }

    const results = await this.repo.assignToGuest(
      input.clinicId,
      input.patientId,
      input.items
    );

    for (const row of results) {
      if (!row.isNewAssignment) continue;

      const docType = await this.repo.findDocumentType(input.clinicId, row.documentTypeId);
      const typeName = docType?.name ?? "File";

      notificationService
        .emitGuestNotification(input.patientId, input.clinicId, {
          type: "DOCUMENT_ASSIGNED",
          title: "File requested",
          body: `Please upload: ${typeName}`,
          severity: "INFO",
          relatedId: row.id,
          relatedType: "patient_document",
          metadata: { documentId: row.id, patientId: input.patientId },
        })
        .catch(() => {});
    }

    return results;
  }
}

export const assignDocumentsToGuest = new AssignDocumentsToGuest();
