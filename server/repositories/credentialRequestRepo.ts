import { db } from "../db";
import { credentialRequests, clinics, users, patients } from "@shared/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { count } from "drizzle-orm";

export type CredentialRequestRow = typeof credentialRequests.$inferSelect & {
  clinic: { id: string; name: string; contactEmail: string | null } | null;
  targetUser: { id: string; email: string } | null;
  targetPatient: { id: string; patientKey: string; fullName: string } | null;
};

async function enrich(row: typeof credentialRequests.$inferSelect): Promise<CredentialRequestRow> {
  const [clinic, targetUser, targetPatient] = await Promise.all([
    row.clinicId
      ? db.query.clinics.findFirst({ where: eq(clinics.id, row.clinicId) }).then((c) =>
          c ? { id: c.id, name: c.name, contactEmail: c.contactEmail ?? null } : null
        )
      : Promise.resolve(null),
    row.targetUserId
      ? db.query.users.findFirst({ where: eq(users.id, row.targetUserId) }).then((u) =>
          u ? { id: u.id, email: u.email } : null
        )
      : Promise.resolve(null),
    row.targetPatientId
      ? db.query.patients.findFirst({ where: eq(patients.id, row.targetPatientId) }).then((p) =>
          p ? { id: p.id, patientKey: p.patientKey, fullName: p.fullName } : null
        )
      : Promise.resolve(null),
  ]);
  return { ...row, clinic, targetUser, targetPatient };
}

export const credentialRequestRepo = {
  async create(data: {
    kind: "MANAGER_PASSWORD" | "GUEST_ACCESS_KEY";
    clinicId?: string | null;
    requesterEmail?: string | null;
    targetUserId?: string | null;
    targetPatientId?: string | null;
    message?: string | null;
  }) {
    const [row] = await db.insert(credentialRequests).values(data).returning();
    return row;
  },

  async findById(id: string): Promise<CredentialRequestRow | null> {
    const row = await db.query.credentialRequests.findFirst({
      where: eq(credentialRequests.id, id),
    });
    if (!row) return null;
    return enrich(row);
  },

  async listPending({ limit = 50 }: { limit?: number } = {}): Promise<CredentialRequestRow[]> {
    const rows = await db.query.credentialRequests.findMany({
      where: eq(credentialRequests.status, "PENDING"),
      orderBy: desc(credentialRequests.createdAt),
      limit,
    });
    return Promise.all(rows.map(enrich));
  },

  async listAll({ limit = 100 }: { limit?: number } = {}): Promise<CredentialRequestRow[]> {
    const rows = await db.query.credentialRequests.findMany({
      orderBy: desc(credentialRequests.createdAt),
      limit,
    });
    return Promise.all(rows.map(enrich));
  },

  async countPending(): Promise<number> {
    const [{ total }] = await db
      .select({ total: count() })
      .from(credentialRequests)
      .where(eq(credentialRequests.status, "PENDING"));
    return Number(total);
  },

  async resolve(
    id: string,
    adminId: string,
    opts: { sentToEmail?: string } = {}
  ) {
    const [row] = await db
      .update(credentialRequests)
      .set({
        status: "COMPLETED",
        resolvedAt: new Date(),
        resolvedByAdminId: adminId,
        sentToEmail: opts.sentToEmail ?? null,
      })
      .where(eq(credentialRequests.id, id))
      .returning();
    return row;
  },

  async reject(id: string, adminId: string) {
    const [row] = await db
      .update(credentialRequests)
      .set({
        status: "REJECTED",
        resolvedAt: new Date(),
        resolvedByAdminId: adminId,
      })
      .where(eq(credentialRequests.id, id))
      .returning();
    return row;
  },

  async markOneTimeShown(id: string) {
    await db
      .update(credentialRequests)
      .set({ oneTimeShownAt: new Date() })
      .where(eq(credentialRequests.id, id));
  },
};
