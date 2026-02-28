import { db } from "../db";
import { documentTypes, patientDocuments } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export const documentRepo = {
  async listDocumentTypes(clinicId: string) {
    return db.query.documentTypes.findMany({
      where: eq(documentTypes.clinicId, clinicId),
      orderBy: (d, { asc }) => asc(d.name),
    });
  },

  async createDocumentType(input: {
    clinicId: string;
    name: string;
    description?: string;
    isRequired?: boolean;
  }) {
    const [dt] = await db.insert(documentTypes).values(input).returning();
    return dt;
  },

  async deleteDocumentType(id: string, clinicId: string) {
    const [deleted] = await db
      .delete(documentTypes)
      .where(and(eq(documentTypes.id, id), eq(documentTypes.clinicId, clinicId)))
      .returning();
    return deleted;
  },

  async assignDocumentsToPatient(
    patientId: string,
    clinicId: string,
    documentTypeIds: string[]
  ) {
    const results = [];
    for (const documentTypeId of documentTypeIds) {
      const existing = await db.query.patientDocuments.findFirst({
        where: and(
          eq(patientDocuments.patientId, patientId),
          eq(patientDocuments.documentTypeId, documentTypeId)
        ),
      });
      if (!existing) {
        const [doc] = await db
          .insert(patientDocuments)
          .values({ patientId, clinicId, documentTypeId })
          .returning();
        results.push(doc);
      } else {
        results.push(existing);
      }
    }
    return results;
  },

  async listPatientDocuments(patientId: string, clinicId: string) {
    return db.query.patientDocuments.findMany({
      where: and(
        eq(patientDocuments.patientId, patientId),
        eq(patientDocuments.clinicId, clinicId)
      ),
      with: { documentType: true },
    });
  },

  async updateDocument(id: string, clinicId: string, data: { status?: string; notes?: string }) {
    const [updated] = await db
      .update(patientDocuments)
      .set(data)
      .where(and(eq(patientDocuments.id, id), eq(patientDocuments.clinicId, clinicId)))
      .returning();
    return updated;
  },
};
