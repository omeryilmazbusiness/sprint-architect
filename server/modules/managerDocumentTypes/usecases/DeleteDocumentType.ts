import { AppError } from "../../../auth/errors";
import type { IManagerDocumentTypesRepo, DocumentTypeDTO } from "../repos/ManagerDocumentTypesRepo.drizzle";

export class DeleteDocumentType {
  constructor(private repo: IManagerDocumentTypesRepo) {}

  async execute(id: string, clinicId: string): Promise<DocumentTypeDTO> {
    const inUse = await this.repo.countAssignments(id, clinicId);
    if (inUse > 0) {
      throw new AppError(
        "DOC-TYPE-002",
        "Cannot delete a document type that is assigned to guests. Remove assignments first.",
        409
      );
    }

    const deleted = await this.repo.delete(id, clinicId);
    if (!deleted) {
      throw new AppError("NOT_FOUND", "Document type not found", 404);
    }
    return deleted;
  }
}
