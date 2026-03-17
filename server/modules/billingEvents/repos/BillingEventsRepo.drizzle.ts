import { db } from "../../../db";
import { billingEvents } from "@shared/schema";
import { eq, and, count, sql } from "drizzle-orm";
import type { IBillingEventsRepo, BillingEventRecord } from "./BillingEventsRepo";

export const billingEventsRepo: IBillingEventsRepo = {
  async upsert({ clinicId, patientId, period }): Promise<BillingEventRecord> {
    const [row] = await db
      .insert(billingEvents)
      .values({ clinicId, patientId, period })
      .onConflictDoNothing()
      .returning();

    if (row) return row;

    const existing = await db.query.billingEvents.findFirst({
      where: and(
        eq(billingEvents.clinicId, clinicId),
        eq(billingEvents.period, period),
        eq(billingEvents.patientId, patientId)
      ),
    });

    return existing!;
  },

  async countForPeriod(clinicId: string, period: string): Promise<number> {
    const [{ total }] = await db
      .select({ total: count() })
      .from(billingEvents)
      .where(
        and(
          eq(billingEvents.clinicId, clinicId),
          eq(billingEvents.period, period)
        )
      );
    return Number(total);
  },
};
