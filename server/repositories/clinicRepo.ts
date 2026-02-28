import { db } from "../db";
import { clinics, users, invoices } from "@shared/schema";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { computeNextInvoiceDate } from "../billing/billingService";

export const clinicRepo = {
  async list(filters: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, filters.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (filters.search) conditions.push(ilike(clinics.name, `%${filters.search}%`));
    if (filters.status) conditions.push(eq(clinics.status, filters.status as "ACTIVE" | "INACTIVE" | "SUSPENDED"));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.query.clinics.findMany({
        where,
        orderBy: (c, { asc }) => asc(c.name),
        limit: pageSize,
        offset,
      }),
      db.select({ total: count() }).from(clinics).where(where),
    ]);

    return { rows, total, page, pageSize };
  },

  async findById(id: string) {
    return db.query.clinics.findFirst({ where: eq(clinics.id, id) });
  },

  async getDetail(id: string) {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, id) });
    if (!clinic) return null;

    const [managers, clinicInvoices] = await Promise.all([
      db.query.users.findMany({
        where: and(eq(users.clinicId, id), eq(users.role, "MANAGER")),
        orderBy: (u, { asc }) => asc(u.email),
      }),
      db.query.invoices.findMany({
        where: eq(invoices.clinicId, id),
        orderBy: (inv, { desc }) => desc(inv.period),
        limit: 24,
      }),
    ]);

    const nextInvoiceDate = computeNextInvoiceDate(clinic.billingAnchorDay);
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const currentPeriodInvoice = clinicInvoices.find((i) => i.period === currentPeriod) ?? null;

    const sanitizedManagers = managers.map(({ passwordHash, ...m }) => m);

    return {
      ...clinic,
      nextInvoiceDate: nextInvoiceDate.toISOString(),
      currentPeriodInvoice,
      managers: sanitizedManagers,
      invoiceTimeline: clinicInvoices,
    };
  },

  async create(input: {
    name: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    billingUnitPrice?: number | null;
    currency?: string;
  }) {
    const now = new Date();
    const anchorDay = now.getDate();
    const [clinic] = await db.insert(clinics).values({
      name: input.name,
      status: input.status ?? "ACTIVE",
      billingUnitPrice: input.billingUnitPrice ?? null,
      currency: input.currency ?? "EUR",
      billingAnchorDay: anchorDay,
    }).returning();
    return clinic;
  },

  async update(id: string, input: {
    name?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    billingUnitPrice?: number | null;
    currency?: string;
    billingAnchorDay?: number;
  }) {
    const [updated] = await db
      .update(clinics)
      .set(input)
      .where(eq(clinics.id, id))
      .returning();
    return updated;
  },

  async softDelete(id: string) {
    const [updated] = await db
      .update(clinics)
      .set({ status: "INACTIVE" })
      .where(eq(clinics.id, id))
      .returning();
    return updated;
  },
};
