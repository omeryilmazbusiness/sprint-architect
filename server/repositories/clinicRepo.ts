import { db } from "../db";
import { clinics, users, invoices } from "@shared/schema";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { computeNextInvoiceDate } from "../billing/billingService";

function parseClinic<T extends { services?: string | null }>(clinic: T): T & { services: string[] } {
  let services: string[] = [];
  try { services = JSON.parse(clinic.services ?? "[]"); } catch { services = []; }
  return { ...clinic, services };
}

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

    return { rows: rows.map(parseClinic), total, page, pageSize };
  },

  async findById(id: string) {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, id) });
    return clinic ? parseClinic(clinic) : null;
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
      ...parseClinic(clinic),
      nextInvoiceDate: nextInvoiceDate.toISOString(),
      currentPeriodInvoice,
      managers: sanitizedManagers,
      invoiceTimeline: clinicInvoices,
    };
  },

  async create(input: {
    name: string;
    address?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    websiteUrl?: string | null;
    billingEmail?: string | null;
    services?: string[];
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    billingUnitPrice?: number | null;
    currency?: string;
    notes?: string | null;
  }) {
    const now = new Date();
    const anchorDay = now.getDate();
    const [clinic] = await db.insert(clinics).values({
      name: input.name,
      address: input.address ?? null,
      contactPhone: input.contactPhone ?? null,
      contactEmail: input.contactEmail ?? null,
      websiteUrl: input.websiteUrl ?? null,
      billingEmail: input.billingEmail ?? null,
      services: JSON.stringify(input.services ?? []),
      status: input.status ?? "ACTIVE",
      billingUnitPrice: input.billingUnitPrice ?? null,
      currency: input.currency ?? "EUR",
      billingAnchorDay: anchorDay,
      notes: input.notes ?? null,
    }).returning();
    return parseClinic(clinic);
  },

  async update(id: string, input: {
    name?: string;
    address?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    websiteUrl?: string | null;
    billingEmail?: string | null;
    services?: string[];
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    billingUnitPrice?: number | null;
    currency?: string;
    billingAnchorDay?: number;
    notes?: string | null;
  }) {
    const setData: Record<string, any> = { ...input };
    if (input.services !== undefined) {
      setData.services = JSON.stringify(input.services);
    }
    const [updated] = await db
      .update(clinics)
      .set(setData)
      .where(eq(clinics.id, id))
      .returning();
    return updated ? parseClinic(updated) : null;
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
