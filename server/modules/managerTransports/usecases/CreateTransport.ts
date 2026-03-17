import type { IManagerTransportsRepo } from "../repos/IManagerTransportsRepo";
import type { CreateTransportInput, TransportDTO } from "../schemas/managerTransports.schemas";

export class CreateTransport {
  constructor(private repo: IManagerTransportsRepo) {}

  async execute(clinicId: string, input: CreateTransportInput): Promise<TransportDTO> {
    const normalized: CreateTransportInput = {
      ...input,
      licensePlate: input.licensePlate.trim().toUpperCase(),
    };
    return this.repo.create(clinicId, normalized);
  }
}
