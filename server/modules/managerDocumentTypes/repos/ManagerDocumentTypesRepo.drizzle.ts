import { db } from "../../../db";
import { documentTypes, patientDocuments } from "@shared/schema";
import { eq, and, ilike, asc, sql, count } from "drizzle-orm";

export interface DocumentTypeDTO {
  id: string;
  name: string;
  note: string | null;
  createdAt: Date;
}

export interface IManagerDocumentTypesRepo {
  list(clinicId: string, search?: string): Promise<DocumentTypeDTO[]>;
  findByName(clinicId: string, name: string): Promise<DocumentTypeDTO | null>;
  create(clinicId: string, name: string, note?: string | null): Promise<DocumentTypeDTO>;
  update(id: string, clinicId: string, fields: { name?: string; note?: string | null }): Promise<DocumentTypeDTO | null>;
  delete(id: string, clinicId: string): Promise<DocumentTypeDTO | null>;
  countAssignments(id: string, clinicId: string): Promise<number>;
}

function toDTO(row: any): DocumentTypeDTO {
  return {
    id: row.id,
    name: row.name,
    note: row.description ?? null,
    createdAt: row.createdAt,
  };
}

export class ManagerDocumentTypesRepoDrizzle implements IManagerDocumentTypesRepo {
  async list(clinicId: string, search?: string): Promise<DocumentTypeDTO[]> {
    const rows = await db.query.documentTypes.findMany({
      where: search
        ? and(
            eq(documentTypes.clinicId, clinicId),
            ilike(documentTypes.name, `%${search}%`)
          )
        : eq(documentTypes.clinicId, clinicId),
      orderBy: asc(documentTypes.name),
    });
    return rows.map(toDTO);
  }

  async findByName(clinicId: string, name: string): Promise<DocumentTypeDTO | null> {
    const row = await db.query.documentTypes.findFirst({
      where: and(
        eq(documentTypes.clinicId, clinicId),
        sql`lower(${documentTypes.name}) = lower(${name})`
      ),
    });
    return row ? toDTO(row) : null;
  }

  async create(clinicId: string, name: string, note?: string | null): Promise<DocumentTypeDTO> {
    const [row] = await db
      .insert(documentTypes)
      .values({ clinicId, name, description: note ?? null })
      .returning();
    return toDTO(row);
  }

  async update(id: string, clinicId: string, fields: { name?: string; note?: string | null }): Promise<DocumentTypeDTO | null> {
    const updateValues: Record<string, any> = {};
    if (fields.name !== undefined) updateValues.name = fields.name;
    if (fields.note !== undefined) updateValues.description = fields.note;
    if (Object.keys(updateValues).length === 0) {
      const row = await db.query.documentTypes.findFirst({
        where: and(eq(documentTypes.id, id), eq(documentTypes.clinicId, clinicId)),
      });
      return row ? toDTO(row) : null;
    }
    const [row] = await db
      .update(documentTypes)
      .set(updateValues)
      .where(and(eq(documentTypes.id, id), eq(documentTypes.clinicId, clinicId)))
      .returning();
    return row ? toDTO(row) : null;
  }

  async delete(id: string, clinicId: string): Promise<DocumentTypeDTO | null> {
    const [row] = await db
      .delete(documentTypes)
      .where(and(eq(documentTypes.id, id), eq(documentTypes.clinicId, clinicId)))
      .returning();
    return row ? toDTO(row) : null;
  }

  async countAssignments(id: string, clinicId: string): Promise<number> {
    const [row] = await db
      .select({ n: count() })
      .from(patientDocuments)
      .where(
        and(
          eq(patientDocuments.documentTypeId, id),
          eq(patientDocuments.clinicId, clinicId)
        )
      );
    return row?.n ?? 0;
  }
}
