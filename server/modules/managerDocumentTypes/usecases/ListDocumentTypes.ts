import type { IManagerDocumentTypesRepo, DocumentTypeDTO } from "../repos/ManagerDocumentTypesRepo.drizzle";

export interface ListDocumentTypesResult {
  items: DocumentTypeDTO[];
  totalCount: number;
}

export class ListDocumentTypes {
  constructor(private repo: IManagerDocumentTypesRepo) {}

  async execute(clinicId: string, search?: string): Promise<ListDocumentTypesResult> {
    const items = await this.repo.list(clinicId, search);
    return { items, totalCount: items.length };
  }
}
