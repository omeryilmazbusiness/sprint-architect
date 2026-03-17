import { AppError } from "../../../auth/errors";
import type { IManagerDocumentTypesRepo, DocumentTypeDTO } from "../repos/ManagerDocumentTypesRepo.drizzle";

export class CreateDocumentType {
  constructor(private repo: IManagerDocumentTypesRepo) {}

  async execute(
    clinicId: string,
    rawName: string,
    note?: string | null
  ): Promise<DocumentTypeDTO> {
    const name = rawName.trim().replace(/\s+/g, " ");

    const existing = await this.repo.findByName(clinicId, name);
    if (existing) {
      throw new AppError(
        "DOC-TYPE-001",
        "This document type already exists.",
        409
      );
    }

    return this.repo.create(clinicId, name, note ?? null);
  }
}
