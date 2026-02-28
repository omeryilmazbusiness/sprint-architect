import { db } from "../db";
import { clinics } from "@shared/schema";
import { eq, ilike, and, count, sql } from "drizzle-orm";

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

  async create(input: {
    name: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    billingUnitPrice?: number | null;
    currency?: string;
  }) {
    const [clinic] = await db.insert(clinics).values({
      name: input.name,
      status: input.status ?? "ACTIVE",
      billingUnitPrice: input.billingUnitPrice ?? null,
      currency: input.currency ?? "EUR",
    }).returning();
    return clinic;
  },

  async update(id: string, input: {
    name?: string;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    billingUnitPrice?: number | null;
    currency?: string;
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
