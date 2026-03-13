import { db } from "../db";
import { clinics, users, invoices } from "@shared/schema";
import { eq, ilike, and, count, desc, isNull, inArray } from "drizzle-orm";
import { computeNextInvoiceDate } from "../billing/billingService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrimaryManager {
  id: string;
  email: string;
  fullName: string | null;
  phoneE164: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseClinic<T extends { services?: string | null }>(clinic: T): T & { services: string[] } {
  let services: string[] = [];
  try { services = JSON.parse(clinic.services ?? "[]"); } catch { services = []; }
  return { ...clinic, services };
}

/**
 * Fetch the primary manager for a set of clinics.
 * Strategy: use clinics.primaryManagerUserId (Approach A).
 * Falls back to earliest-created MANAGER if primaryManagerUserId is null.
 */
async function fetchPrimaryManagers(
  clinicRows: Array<{ id: string; primaryManagerUserId?: string | null }>
): Promise<Map<string, PrimaryManager>> {
  if (clinicRows.length === 0) return new Map();

  const map = new Map<string, PrimaryManager>();

  const explicitIds = clinicRows
    .filter((c) => c.primaryManagerUserId)
    .map((c) => c.primaryManagerUserId as string);

  const clinicsWithoutPrimary = clinicRows.filter((c) => !c.primaryManagerUserId);

  const [explicitManagers, fallbackManagers] = await Promise.all([
    explicitIds.length > 0
      ? db.query.users.findMany({
          where: inArray(users.id, explicitIds),
          columns: { id: true, email: true, fullName: true, phoneE164: true, clinicId: true },
        })
      : Promise.resolve([]),
    clinicsWithoutPrimary.length > 0
      ? db.query.users.findMany({
          where: and(
            inArray(users.clinicId, clinicsWithoutPrimary.map((c) => c.id)),
            eq(users.role, "MANAGER"),
          ),
          orderBy: (u, { asc }) => asc(u.createdAt),
          columns: { id: true, email: true, fullName: true, phoneE164: true, clinicId: true },
        })
      : Promise.resolve([]),
  ]);

  for (const clinic of clinicRows) {
    if (clinic.primaryManagerUserId) {
      const mgr = explicitManagers.find((m) => m.id === clinic.primaryManagerUserId);
      if (mgr) {
        map.set(clinic.id, { id: mgr.id, email: mgr.email, fullName: mgr.fullName ?? null, phoneE164: mgr.phoneE164 ?? null });
      }
    } else {
      const mgr = fallbackManagers.find((m) => m.clinicId === clinic.id);
      if (mgr) {
        map.set(clinic.id, { id: mgr.id, email: mgr.email, fullName: mgr.fullName ?? null, phoneE164: mgr.phoneE164 ?? null });
      }
    }
  }

  return map;
}

// ─── Repository ───────────────────────────────────────────────────────────────

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

    const conditions: ReturnType<typeof eq>[] = [isNull(clinics.deletedAt) as any];
    if (filters.search) conditions.push(ilike(clinics.name, `%${filters.search}%`) as any);
    if (filters.status) conditions.push(eq(clinics.status, filters.status as "ACTIVE" | "INACTIVE" | "SUSPENDED") as any);
    const where = and(...conditions);

    const [rows, [{ total }]] = await Promise.all([
      db.query.clinics.findMany({
        where,
        orderBy: (c, { asc }) => asc(c.name),
        limit: pageSize,
        offset,
      }),
      db.select({ total: count() }).from(clinics).where(where),
    ]);

    const parsed = rows.map(parseClinic);
    const primaryManagers = await fetchPrimaryManagers(parsed);

    return {
      rows: parsed.map((c) => ({
        ...c,
        primaryManager: primaryManagers.get(c.id) ?? null,
      })),
      total,
      page,
      pageSize,
    };
  },

  async findById(id: string) {
    const clinic = await db.query.clinics.findFirst({
      where: and(eq(clinics.id, id), isNull(clinics.deletedAt)),
    });
    return clinic ? parseClinic(clinic) : null;
  },

  async getDetail(id: string) {
    const clinic = await db.query.clinics.findFirst({
      where: and(eq(clinics.id, id), isNull(clinics.deletedAt)),
    });
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

    const primaryMgrMap = await fetchPrimaryManagers([clinic]);
    const primaryManager = primaryMgrMap.get(id) ?? null;

    return {
      ...parseClinic(clinic),
      nextInvoiceDate: nextInvoiceDate.toISOString(),
      currentPeriodInvoice,
      managers: sanitizedManagers,
      primaryManager,
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

  async setPrimaryManager(clinicId: string, managerUserId: string | null) {
    const [updated] = await db
      .update(clinics)
      .set({ primaryManagerUserId: managerUserId })
      .where(and(eq(clinics.id, clinicId), isNull(clinics.deletedAt)))
      .returning();
    return updated ?? null;
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
    primaryManagerUserId?: string | null;
  }) {
    const setData: Record<string, any> = { ...input };
    if (input.services !== undefined) {
      setData.services = JSON.stringify(input.services);
    }
    const [updated] = await db
      .update(clinics)
      .set(setData)
      .where(and(eq(clinics.id, id), isNull(clinics.deletedAt)))
      .returning();
    return updated ? parseClinic(updated) : null;
  },

  /** Soft-delete: marks deletedAt, sets status to INACTIVE, deactivates manager users. */
  async softDelete(id: string) {
    const now = new Date();
    const [updated] = await db
      .update(clinics)
      .set({ deletedAt: now, status: "INACTIVE" })
      .where(eq(clinics.id, id))
      .returning();

    if (updated) {
      await db
        .update(users)
        .set({ status: "INACTIVE", statusReason: "Clinic deleted" })
        .where(and(eq(users.clinicId, id), eq(users.role, "MANAGER")));
    }

    return updated;
  },
};
