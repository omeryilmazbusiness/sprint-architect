import { db } from "../db";
import { hotels } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface CreateHotelInput {
  clinicId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  stars?: number;
  phone?: string;
  website?: string;
  notes?: string;
}

export const hotelRepo = {
  async create(input: CreateHotelInput) {
    const [hotel] = await db.insert(hotels).values(input).returning();
    return hotel;
  },

  async list(clinicId: string) {
    return db.query.hotels.findMany({
      where: eq(hotels.clinicId, clinicId),
      orderBy: (h, { asc }) => asc(h.name),
    });
  },

  async findById(id: string, clinicId: string) {
    return db.query.hotels.findFirst({
      where: and(eq(hotels.id, id), eq(hotels.clinicId, clinicId)),
    });
  },

  async update(id: string, clinicId: string, input: Partial<CreateHotelInput>) {
    const { clinicId: _cid, ...safeInput } = input as any;
    const [updated] = await db
      .update(hotels)
      .set(safeInput)
      .where(and(eq(hotels.id, id), eq(hotels.clinicId, clinicId)))
      .returning();
    return updated;
  },

  async delete(id: string, clinicId: string) {
    const [deleted] = await db
      .delete(hotels)
      .where(and(eq(hotels.id, id), eq(hotels.clinicId, clinicId)))
      .returning();
    return deleted;
  },
};
