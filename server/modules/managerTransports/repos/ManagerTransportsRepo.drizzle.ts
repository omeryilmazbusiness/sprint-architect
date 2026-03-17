import { db } from "../../../db";
import { transports } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { IManagerTransportsRepo } from "./IManagerTransportsRepo";
import type { CreateTransportInput, UpdateTransportInput, TransportDTO } from "../schemas/managerTransports.schemas";

function toDTO(row: typeof transports.$inferSelect): TransportDTO {
  return {
    id: row.id,
    driverFullName: row.driverName ?? "",
    driverPhoneE164: row.driverPhone,
    vehicleBrand: row.vehicleBrand ?? "",
    vehicleModel: row.vehicleModel ?? "",
    licensePlate: row.vehiclePlate ?? "",
    vehicleColor: row.vehicleInfo ?? null,
    vehicleYear: null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class ManagerTransportsRepoDrizzle implements IManagerTransportsRepo {
  async list(clinicId: string): Promise<TransportDTO[]> {
    const rows = await db.query.transports.findMany({
      where: eq(transports.clinicId, clinicId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
    return rows.map(toDTO);
  }

  async findById(id: string, clinicId: string): Promise<TransportDTO | null> {
    const row = await db.query.transports.findFirst({
      where: and(eq(transports.id, id), eq(transports.clinicId, clinicId)),
    });
    return row ? toDTO(row) : null;
  }

  async create(clinicId: string, input: CreateTransportInput): Promise<TransportDTO> {
    const [row] = await db
      .insert(transports)
      .values({
        clinicId,
        driverName: input.driverFullName,
        driverPhone: input.driverPhoneE164,
        vehicleBrand: input.vehicleBrand,
        vehicleModel: input.vehicleModel,
        vehiclePlate: input.licensePlate.trim().toUpperCase(),
        vehicleInfo: input.vehicleColor ?? null,
      })
      .returning();
    return toDTO(row);
  }

  async update(id: string, clinicId: string, input: UpdateTransportInput): Promise<TransportDTO | null> {
    const updateValues: Partial<typeof transports.$inferInsert> = {};
    if (input.driverFullName !== undefined) updateValues.driverName = input.driverFullName;
    if (input.driverPhoneE164 !== undefined) updateValues.driverPhone = input.driverPhoneE164;
    if (input.vehicleBrand !== undefined) updateValues.vehicleBrand = input.vehicleBrand;
    if (input.vehicleModel !== undefined) updateValues.vehicleModel = input.vehicleModel;
    if (input.licensePlate !== undefined) updateValues.vehiclePlate = input.licensePlate.trim().toUpperCase();
    if (input.vehicleColor !== undefined) updateValues.vehicleInfo = input.vehicleColor;

    const [row] = await db
      .update(transports)
      .set(updateValues)
      .where(and(eq(transports.id, id), eq(transports.clinicId, clinicId)))
      .returning();
    return row ? toDTO(row) : null;
  }

  async delete(id: string, clinicId: string): Promise<boolean> {
    const [row] = await db
      .delete(transports)
      .where(and(eq(transports.id, id), eq(transports.clinicId, clinicId)))
      .returning();
    return !!row;
  }
}
