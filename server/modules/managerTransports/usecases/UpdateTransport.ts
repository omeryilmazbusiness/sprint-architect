import { AppError } from "../../../auth/errors";
import type { IManagerTransportsRepo } from "../repos/IManagerTransportsRepo";
import type { UpdateTransportInput, TransportDTO } from "../schemas/managerTransports.schemas";

export class UpdateTransport {
  constructor(private repo: IManagerTransportsRepo) {}

  async execute(id: string, clinicId: string, input: UpdateTransportInput): Promise<TransportDTO> {
    const normalized: UpdateTransportInput = {
      ...input,
      ...(input.licensePlate ? { licensePlate: input.licensePlate.trim().toUpperCase() } : {}),
    };
    const result = await this.repo.update(id, clinicId, normalized);
    if (!result) throw new AppError("TRN-NOT-404", "Transport not found", 404);
    return result;
  }
}
