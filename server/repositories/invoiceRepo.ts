import { db } from "../db";
import { invoices, clinics, patients } from "@shared/schema";
import { eq, and, sql, gte, lt, not, isNotNull } from "drizzle-orm";
import { reactivateClinicAfterPayment } from "../billing/billingService";
import { auditLog } from "../api/auditLogger";
import { generatePendingInvoicesForPeriod } from "../billing/billingService";

export const invoiceRepo = {
  async generateForPeriod(period: string) {
    return generatePendingInvoicesForPeriod(period);
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

  async updateStatus(id: string, status: "PENDING" | "UNPAID" | "PAID", paidByUserId?: string) {
    const setValues: Record<string, any> = { status };
    if (status === "PAID") {
      setValues.paidAt = new Date();
      if (paidByUserId) setValues.paidByUserId = paidByUserId;
    }

    const [updated] = await db
      .update(invoices)
      .set(setValues)
      .where(eq(invoices.id, id))
      .returning();

    if (updated && status === "PAID") {
      await reactivateClinicAfterPayment(updated.clinicId, paidByUserId);
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
