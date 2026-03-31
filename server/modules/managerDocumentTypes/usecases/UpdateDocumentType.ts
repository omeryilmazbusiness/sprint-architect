import { AppError } from "../../../auth/errors";
import type { IManagerDocumentTypesRepo, DocumentTypeDTO } from "../repos/ManagerDocumentTypesRepo.drizzle";

export class UpdateDocumentType {
  constructor(private repo: IManagerDocumentTypesRepo) {}

  async execute(
    id: string,
    clinicId: string,
    fields: { name?: string; note?: string | null }
  ): Promise<DocumentTypeDTO> {
    if (fields.name !== undefined) {
      const name = fields.name.trim().replace(/\s+/g, " ");
      const existing = await this.repo.findByName(clinicId, name);
      if (existing && existing.id !== id) {
        throw new AppError("DOC-TYPE-001", "This document type already exists.", 409);
      }
      fields = { ...fields, name };
    }
    const result = await this.repo.update(id, clinicId, fields);
    if (!result) {
      throw new AppError("DOC-TYPE-404", "Document type not found.", 404);
    }
    return result;
  }
}
