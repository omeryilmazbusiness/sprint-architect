import type { IManagerTransportsRepo } from "../repos/IManagerTransportsRepo";
import type { TransportDTO } from "../schemas/managerTransports.schemas";

export class ListTransports {
  constructor(private repo: IManagerTransportsRepo) {}

  async execute(clinicId: string): Promise<TransportDTO[]> {
    return this.repo.list(clinicId);
  }
}
