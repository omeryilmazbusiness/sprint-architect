import { db } from "../db";
import { users, clinics } from "@shared/schema";
import { eq, ilike, and, count } from "drizzle-orm";
import { hashPassword } from "../auth/password";

type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
type UserRole = "ADMIN" | "MANAGER";

export const userRepo = {
  async list(filters: {
    search?: string;
    role?: string;
    status?: string;
    clinicId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, filters.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (filters.search) conditions.push(ilike(users.email, `%${filters.search}%`));
    if (filters.role) conditions.push(eq(users.role, filters.role as UserRole));
    if (filters.status) conditions.push(eq(users.status, filters.status as UserStatus));
    if (filters.clinicId) conditions.push(eq(users.clinicId, filters.clinicId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.query.users.findMany({
        where,
        with: { clinic: true },
        orderBy: (u, { asc }) => asc(u.email),
        limit: pageSize,
        offset,
      }),
      db.select({ total: count() }).from(users).where(where),
    ]);

    return {
      rows: rows.map(u => sanitize(u)),
      total,
      page,
      pageSize,
    };
  },

  async findById(id: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { clinic: true },
    });
    if (!user) return null;
    return sanitize(user);
  },

  async findByEmail(email: string) {
    return db.query.users.findFirst({ where: eq(users.email, email) });
  },

  async create(input: {
    email: string;
    password: string;
    role: UserRole;
    clinicId?: string | null;
    status?: UserStatus;
  }) {
    const passwordHash = await hashPassword(input.password);
    const [user] = await db.insert(users).values({
      email: input.email,
      passwordHash,
      role: input.role,
      clinicId: input.clinicId ?? null,
      status: input.status ?? "ACTIVE",
    }).returning();
    return sanitize(user as any);
  },

  async update(id: string, input: {
    email?: string;
    role?: UserRole;
    clinicId?: string | null;
    status?: UserStatus;
  }) {
    const [updated] = await db
      .update(users)
      .set(input)
      .where(eq(users.id, id))
      .returning();
    if (!updated) return null;
    return sanitize(updated as any);
  },

  async setPassword(id: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);
    const [updated] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning();
    return !!updated;
  },

  async softDelete(id: string) {
    const [updated] = await db
      .update(users)
      .set({ status: "INACTIVE" })
      .where(eq(users.id, id))
      .returning();
    return updated ? sanitize(updated as any) : null;
  },
};

function sanitize(user: any) {
  const { passwordHash, ...safe } = user;
  return safe;
}
