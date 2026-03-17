import { db } from "../../../db";
import { documentTypes } from "@shared/schema";
import { eq, and, ilike, asc, sql } from "drizzle-orm";

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
  delete(id: string, clinicId: string): Promise<DocumentTypeDTO | null>;
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

  async delete(id: string, clinicId: string): Promise<DocumentTypeDTO | null> {
    const [row] = await db
      .delete(documentTypes)
      .where(and(eq(documentTypes.id, id), eq(documentTypes.clinicId, clinicId)))
      .returning();
    return row ? toDTO(row) : null;
  }
}
