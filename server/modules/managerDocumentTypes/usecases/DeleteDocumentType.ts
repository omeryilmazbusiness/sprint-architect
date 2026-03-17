import { AppError } from "../../../auth/errors";
import type { IManagerDocumentTypesRepo, DocumentTypeDTO } from "../repos/ManagerDocumentTypesRepo.drizzle";

export class DeleteDocumentType {
  constructor(private repo: IManagerDocumentTypesRepo) {}

  async execute(id: string, clinicId: string): Promise<DocumentTypeDTO> {
    const deleted = await this.repo.delete(id, clinicId);
    if (!deleted) {
      throw new AppError("NOT_FOUND", "Document type not found", 404);
    }
    return deleted;
  }
}
