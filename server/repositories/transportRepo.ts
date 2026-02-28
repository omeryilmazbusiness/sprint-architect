import { db } from "../db";
import { transports } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface CreateTransportInput {
  clinicId: string;
  driverPhone: string;
  driverName?: string;
  vehicleInfo?: string;
  meetingPointText?: string;
  latitude?: number;
  longitude?: number;
}

export const transportRepo = {
  async create(input: CreateTransportInput) {
    const [transport] = await db.insert(transports).values(input).returning();
    return transport;
  },

  async list(clinicId: string) {
    return db.query.transports.findMany({
      where: eq(transports.clinicId, clinicId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });
  },

  async findById(id: string, clinicId: string) {
    return db.query.transports.findFirst({
      where: and(eq(transports.id, id), eq(transports.clinicId, clinicId)),
    });
  },

  async update(id: string, clinicId: string, input: Partial<CreateTransportInput>) {
    const [updated] = await db
      .update(transports)
      .set(input)
      .where(and(eq(transports.id, id), eq(transports.clinicId, clinicId)))
      .returning();
    return updated;
  },

  async delete(id: string, clinicId: string) {
    const [deleted] = await db
      .delete(transports)
      .where(and(eq(transports.id, id), eq(transports.clinicId, clinicId)))
      .returning();
    return deleted;
  },
};
