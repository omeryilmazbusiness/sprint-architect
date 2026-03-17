import type { CreateTransportInput, UpdateTransportInput, TransportDTO } from "../schemas/managerTransports.schemas";

export interface IManagerTransportsRepo {
  list(clinicId: string): Promise<TransportDTO[]>;
  findById(id: string, clinicId: string): Promise<TransportDTO | null>;
  create(clinicId: string, input: CreateTransportInput): Promise<TransportDTO>;
  update(id: string, clinicId: string, input: UpdateTransportInput): Promise<TransportDTO | null>;
  delete(id: string, clinicId: string): Promise<boolean>;
}
