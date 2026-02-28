import { db } from "../db";
import { invoices, clinics, patients } from "@shared/schema";
import { eq, and, sql, gte, lt } from "drizzle-orm";

export const invoiceRepo = {
  async generateForPeriod(period: string) {
    const allClinics = await db.query.clinics.findMany();
    const generatedInvoices = [];

    // Period is YYYY-MM
    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    for (const clinic of allClinics) {
      // Count patients created in this period
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinic.id),
            gte(patients.createdAt, startDate),
            lt(patients.createdAt, endDate)
          )
        );

      const unitPrice = clinic.billingUnitPrice ?? parseFloat(process.env.DEFAULT_UNIT_PRICE ?? "50");
      const total = count * unitPrice;

      // Check if invoice already exists
      const existing = await db.query.invoices.findFirst({
        where: and(eq(invoices.clinicId, clinic.id), eq(invoices.period, period)),
      });

      let invoice;
      if (existing) {
        [invoice] = await db
          .update(invoices)
          .set({
            patientCount: count,
            unitPrice,
            total,
            currency: clinic.currency,
            updatedAt: new Date(),
          } as any)
          .where(eq(invoices.id, existing.id))
          .returning();
      } else {
        [invoice] = await db
          .insert(invoices)
          .values({
            clinicId: clinic.id,
            period,
            patientCount: count,
            unitPrice,
            total,
            currency: clinic.currency,
            status: "DRAFT",
          })
          .returning();
      }
      generatedInvoices.push(invoice);
    }

    return generatedInvoices;
  },

  async list(filters: { clinicId?: string; period?: string; status?: any }) {
    const conditions = [];
    if (filters.clinicId) conditions.push(eq(invoices.clinicId, filters.clinicId));
    if (filters.period) conditions.push(eq(invoices.period, filters.period));
    if (filters.status) conditions.push(eq(invoices.status, filters.status));

    return db.query.invoices.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        clinic: true,
      },
      orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
    });
  },

  async findById(id: string, clinicId?: string) {
    const conditions = [eq(invoices.id, id)];
    if (clinicId) conditions.push(eq(invoices.clinicId, clinicId));

    return db.query.invoices.findFirst({
      where: and(...conditions),
      with: {
        clinic: true,
      },
    });
  },

  async updateStatus(id: string, status: "DRAFT" | "ISSUED" | "PAID") {
    const [updated] = await db
      .update(invoices)
      .set({ status })
      .where(eq(invoices.id, id))
      .returning();
    return updated;
  },
};
