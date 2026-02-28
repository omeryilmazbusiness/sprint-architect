import { db } from "../db";
import { patientPlans, hotels, transports } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface UpsertPlanInput {
  patientId: string;
  clinicId: string;
  hotelId?: string | null;
  transportId?: string | null;
  hotelStayDays?: number | null;
  roomNo?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
}

export const planRepo = {
  async upsert(input: UpsertPlanInput) {
    const existing = await db.query.patientPlans.findFirst({
      where: eq(patientPlans.patientId, input.patientId),
    });

    if (existing) {
      const [updated] = await db
        .update(patientPlans)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(patientPlans.patientId, input.patientId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(patientPlans)
        .values(input)
        .returning();
      return created;
    }
  },

  async findByPatient(patientId: string) {
    return db.query.patientPlans.findFirst({
      where: eq(patientPlans.patientId, patientId),
      with: { hotel: true, transport: true },
    });
  },
};
