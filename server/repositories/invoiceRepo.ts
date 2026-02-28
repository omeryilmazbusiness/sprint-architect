import { db } from "../db";
import { invoices, clinics, patients } from "@shared/schema";
import { eq, and, sql, gte, lt, not, isNotNull } from "drizzle-orm";
import { reactivateClinicAfterPayment } from "../billing/billingService";
import { auditLog } from "../api/auditLogger";

export const invoiceRepo = {
  async generateForPeriod(period: string) {
    const allClinics = await db.query.clinics.findMany();
    const generatedInvoices = [];

    const [year, month] = period.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);
    const graceDays = parseInt(process.env.BILLING_GRACE_DAYS ?? "7");

    for (const clinic of allClinics) {
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

      const existing = await db.query.invoices.findFirst({
        where: and(eq(invoices.clinicId, clinic.id), eq(invoices.period, period)),
      });

      let invoice;
      if (existing) {
        const now = new Date();
        const dueAt = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);
        [invoice] = await db
          .update(invoices)
          .set({
            patientCount: count,
            unitPrice,
            total,
            currency: clinic.currency,
            issuedAt: now,
            dueAt,
          } as any)
          .where(eq(invoices.id, existing.id))
          .returning();
      } else {
        const now = new Date();
        const dueAt = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000);
        [invoice] = await db
          .insert(invoices)
          .values({
            clinicId: clinic.id,
            period,
            patientCount: count,
            unitPrice,
            total,
            currency: clinic.currency,
            status: "ISSUED",
            issuedAt: now,
            dueAt,
          })
          .returning();
      }
      generatedInvoices.push(invoice);
    }

    return generatedInvoices;
  },

  async list(filters: { clinicId?: string; period?: string; status?: any; page?: number; pageSize?: number }) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, filters.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (filters.clinicId) conditions.push(eq(invoices.clinicId, filters.clinicId));
    if (filters.period) conditions.push(eq(invoices.period, filters.period));
    if (filters.status) conditions.push(eq(invoices.status, filters.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.query.invoices.findMany({
        where,
        with: { clinic: true },
        orderBy: (inv, { desc }) => [desc(inv.period)],
        limit: pageSize,
        offset,
      }),
      db.select({ total: sql<number>`count(*)::int` }).from(invoices).where(where),
    ]);

    return { rows, total, page, pageSize };
  },

  async findById(id: string, clinicId?: string) {
    const conditions = [eq(invoices.id, id)];
    if (clinicId) conditions.push(eq(invoices.clinicId, clinicId));

    return db.query.invoices.findFirst({
      where: and(...conditions),
      with: { clinic: true },
    });
  },

  async updateStatus(id: string, status: "DRAFT" | "ISSUED" | "PAID") {
    const paidAt = status === "PAID" ? new Date() : undefined;
    const issuedAt = status === "ISSUED" ? new Date() : undefined;

    const setValues: Record<string, any> = { status };
    if (paidAt) setValues.paidAt = paidAt;
    if (issuedAt) setValues.issuedAt = issuedAt;

    const [updated] = await db
      .update(invoices)
      .set(setValues)
      .where(eq(invoices.id, id))
      .returning();

    if (updated && status === "PAID") {
      reactivateClinicAfterPayment(updated.clinicId).catch((e) =>
        console.error("[billing] reactivate error:", e)
      );
    }

    return updated;
  },

  async findOverdue() {
    const now = new Date();
    return db.query.invoices.findMany({
      where: and(
        not(eq(invoices.status, "PAID")),
        isNotNull(invoices.dueAt),
        lt(invoices.dueAt as any, now)
      ),
      with: { clinic: true },
    });
  },
};
