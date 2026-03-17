import { AppError } from "../../../auth/errors";
import type { IManagerTransportsRepo } from "../repos/IManagerTransportsRepo";

export class DeleteTransport {
  constructor(private repo: IManagerTransportsRepo) {}

  async execute(id: string, clinicId: string): Promise<void> {
    const deleted = await this.repo.delete(id, clinicId);
    if (!deleted) throw new AppError("TRN-NOT-404", "Transport not found", 404);
  }
}
