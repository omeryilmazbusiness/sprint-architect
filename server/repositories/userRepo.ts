import { db } from "../db";
import { users, patients, clinics } from "@shared/schema";
import { eq, ilike, and, or, count, sql, inArray } from "drizzle-orm";
import { hashPassword } from "../auth/password";
import crypto from "crypto";

type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER";

export function generateSecurePassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;

  const bytes = crypto.randomBytes(20);
  let password = "";
  password += upper[bytes[0] % upper.length];
  password += lower[bytes[1] % lower.length];
  password += digits[bytes[2] % digits.length];
  password += special[bytes[3] % special.length];
  for (let i = 4; i < 16; i++) {
    password += all[bytes[i] % all.length];
  }

  const arr = password.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomBytes(1)[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export interface UnifiedEntity {
  id: string;
  entityType: "ADMIN" | "MANAGER" | "PATIENT";
  clinicId: string | null;
  clinicName: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  patientKey?: string;
  status: string;
  createdAt: string;
}

export const userRepo = {
  async listUnified(filters: {
    search?: string;
    entityType?: "ADMIN" | "MANAGER" | "PATIENT";
    status?: string;
    clinicId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ rows: UnifiedEntity[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, filters.pageSize ?? 30);

    const showManagers = !filters.entityType || filters.entityType === "ADMIN" || filters.entityType === "MANAGER";
    const showPatients = !filters.entityType || filters.entityType === "PATIENT";

    // Fetch clinic lookup for patients
    const allClinics = await db.query.clinics.findMany();
    const clinicMap = new Map(allClinics.map((c) => [c.id, c.name]));

    const results: UnifiedEntity[] = [];

    if (showManagers) {
      const conditions = [];
      if (filters.search) {
        conditions.push(
          or(
            ilike(users.email, `%${filters.search}%`),
            ilike(users.fullName, `%${filters.search}%`),
          ),
        );
      }
      if (filters.entityType === "ADMIN") {
        conditions.push(inArray(users.role, ["ADMIN", "SUPER_ADMIN"]));
      } else if (filters.entityType === "MANAGER") {
        conditions.push(eq(users.role, "MANAGER"));
      }
      if (filters.status) conditions.push(eq(users.status, filters.status as UserStatus));
      if (filters.clinicId) conditions.push(eq(users.clinicId, filters.clinicId));

      const userRows = await db.query.users.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { clinic: true },
        orderBy: (u, { asc }) => asc(u.email),
      });

      for (const u of userRows) {
        results.push({
          id: u.id,
          entityType: (u.role === "SUPER_ADMIN" ? "ADMIN" : u.role) as "ADMIN" | "MANAGER",
          clinicId: u.clinicId ?? null,
          clinicName: (u as any).clinic?.name ?? null,
          displayName: u.fullName ?? u.email,
          email: u.email,
          phone: u.phoneE164 ?? null,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
        });
      }
    }

    if (showPatients) {
      const patientConditions = [];
      if (filters.search) patientConditions.push(ilike(patients.fullName, `%${filters.search}%`));
      if (filters.status) patientConditions.push(eq(patients.status, filters.status as any));
      if (filters.clinicId) patientConditions.push(eq(patients.clinicId, filters.clinicId));

      const patientRows = await db.query.patients.findMany({
        where: patientConditions.length > 0 ? and(...patientConditions) : undefined,
        orderBy: (p, { asc }) => asc(p.fullName),
      });

      for (const p of patientRows) {
        results.push({
          id: p.id,
          entityType: "PATIENT",
          clinicId: p.clinicId,
          clinicName: clinicMap.get(p.clinicId) ?? null,
          displayName: p.fullName,
          email: p.email ?? null,
          phone: p.phone ?? null,
          patientKey: p.patientKey,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
        });
      }
    }

    // Sort combined results by createdAt desc
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = results.length;
    const offset = (page - 1) * pageSize;
    return { rows: results.slice(offset, offset + pageSize), total, page, pageSize };
  },

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
      rows: rows.map((u) => sanitize(u)),
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
    fullName?: string | null;
    phoneE164?: string | null;
    status?: UserStatus;
    mustChangePassword?: boolean;
  }) {
    const passwordHash = await hashPassword(input.password);
    const [user] = await db.insert(users).values({
      email: input.email,
      passwordHash,
      role: input.role,
      clinicId: input.clinicId ?? null,
      fullName: input.fullName ?? null,
      phoneE164: input.phoneE164 ?? null,
      status: input.status ?? "ACTIVE",
      mustChangePassword: input.mustChangePassword ?? false,
    }).returning();
    return sanitize(user as any);
  },

  async update(id: string, input: {
    email?: string;
    role?: UserRole;
    clinicId?: string | null;
    fullName?: string | null;
    phoneE164?: string | null;
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
      .set({ passwordHash, mustChangePassword: false })
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
