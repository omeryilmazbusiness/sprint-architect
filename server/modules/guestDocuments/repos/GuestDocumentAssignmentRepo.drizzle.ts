import { db } from "../../../db";
import { documentTypes, patientDocuments } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import type {
  AssignDocumentItemInput,
  AssignedPatientDocumentRow,
  IGuestDocumentAssignmentRepo,
} from "../ports/IGuestDocumentAssignmentRepo";

export class GuestDocumentAssignmentRepoDrizzle implements IGuestDocumentAssignmentRepo {
  async findDocumentType(clinicId: string, documentTypeId: string) {
    const row = await db.query.documentTypes.findFirst({
      where: and(eq(documentTypes.id, documentTypeId), eq(documentTypes.clinicId, clinicId)),
      columns: { id: true, name: true },
    });
    return row ?? null;
  }

  async assignToGuest(
    clinicId: string,
    patientId: string,
    items: AssignDocumentItemInput[]
  ): Promise<AssignedPatientDocumentRow[]> {
    const results: AssignedPatientDocumentRow[] = [];

    for (const item of items) {
      const existing = await db.query.patientDocuments.findFirst({
        where: and(
          eq(patientDocuments.patientId, patientId),
          eq(patientDocuments.documentTypeId, item.documentTypeId),
          eq(patientDocuments.clinicId, clinicId)
        ),
      });

      if (existing) {
        const wasPending = existing.status === "ASSIGNED" || existing.status === "REJECTED";
        const [updated] = await db
          .update(patientDocuments)
          .set({
            status: "ASSIGNED",
            instructionText: item.instructionText ?? null,
            updatedAt: new Date(),
          })
          .where(eq(patientDocuments.id, existing.id))
          .returning();

        results.push({
          id: updated.id,
          patientId: updated.patientId,
          clinicId: updated.clinicId,
          documentTypeId: updated.documentTypeId,
          status: updated.status,
          instructionText: updated.instructionText,
          isNewAssignment: !wasPending,
        });
      } else {
        const [inserted] = await db
          .insert(patientDocuments)
          .values({
            clinicId,
            patientId,
            documentTypeId: item.documentTypeId,
            status: "ASSIGNED",
            instructionText: item.instructionText ?? null,
          })
          .returning();

        results.push({
          id: inserted.id,
          patientId: inserted.patientId,
          clinicId: inserted.clinicId,
          documentTypeId: inserted.documentTypeId,
          status: inserted.status,
          instructionText: inserted.instructionText,
          isNewAssignment: true,
        });
      }
    }

    return results;
  }
}

export const guestDocumentAssignmentRepo = new GuestDocumentAssignmentRepoDrizzle();
