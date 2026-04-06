import { db } from "../db";
import { notifications, type Notification } from "@shared/schema";
import { eq, and, desc, count, isNull } from "drizzle-orm";

export const notificationRepo = {
  // ─── Manager ──────────────────────────────────────────────────────────────

  async getUnreadCount(clinicId: string): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.clinicId, clinicId),
          eq(notifications.status, "UNREAD"),
          eq(notifications.targetRole, "MANAGER"),
        ),
      );
    return result.value;
  },

  async list(clinicId: string, status?: "UNREAD" | "READ", limit?: number): Promise<Notification[]> {
    const whereClause = [
      eq(notifications.clinicId, clinicId),
      eq(notifications.targetRole, "MANAGER"),
    ];

    if (status) {
      whereClause.push(eq(notifications.status, status));
    }

    return db.query.notifications.findMany({
      where: and(...whereClause),
      orderBy: [desc(notifications.createdAt)],
      limit: limit ?? 50,
    });
  },

  async markRead(id: string, clinicId: string): Promise<Notification | null> {
    const [updated] = await db
      .update(notifications)
      .set({ status: "READ", readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.clinicId, clinicId),
          eq(notifications.targetRole, "MANAGER"),
        ),
      )
      .returning();
    return updated ?? null;
  },

  async markAllRead(clinicId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ status: "READ", readAt: new Date() })
      .where(
        and(
          eq(notifications.clinicId, clinicId),
          eq(notifications.targetRole, "MANAGER"),
        ),
      );
  },

  // ─── Admin ─────────────────────────────────────────────────────────────────

  async getAdminUnreadCount(): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          isNull(notifications.clinicId),
          eq(notifications.status, "UNREAD"),
          eq(notifications.targetRole, "ADMIN"),
        ),
      );
    return result.value;
  },

  async listAdmin(limit?: number, offset?: number): Promise<Notification[]> {
    return db.query.notifications.findMany({
      where: and(
        isNull(notifications.clinicId),
        eq(notifications.targetRole, "ADMIN"),
      ),
      orderBy: [desc(notifications.createdAt)],
      limit: limit ?? 50,
      offset: offset ?? 0,
    });
  },

  async markAdminRead(id: string): Promise<Notification | null> {
    const [updated] = await db
      .update(notifications)
      .set({ status: "READ", readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          isNull(notifications.clinicId),
          eq(notifications.targetRole, "ADMIN"),
        ),
      )
      .returning();
    return updated ?? null;
  },

  async markAllAdminRead(): Promise<void> {
    await db
      .update(notifications)
      .set({ status: "READ", readAt: new Date() })
      .where(
        and(
          isNull(notifications.clinicId),
          eq(notifications.targetRole, "ADMIN"),
        ),
      );
  },

  // ─── Guest / Patient ───────────────────────────────────────────────────────

  async getPatientUnreadCount(patientId: string): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.targetRole, "PATIENT"),
          eq(notifications.targetPatientId, patientId),
          eq(notifications.status, "UNREAD"),
        ),
      );
    return result.value;
  },

  async listForPatient(patientId: string, limit?: number): Promise<Notification[]> {
    return db.query.notifications.findMany({
      where: and(
        eq(notifications.targetRole, "PATIENT"),
        eq(notifications.targetPatientId, patientId),
      ),
      orderBy: [desc(notifications.createdAt)],
      limit: limit ?? 50,
    });
  },

  async markPatientRead(id: string, patientId: string): Promise<Notification | null> {
    const [updated] = await db
      .update(notifications)
      .set({ status: "READ", readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.targetRole, "PATIENT"),
          eq(notifications.targetPatientId, patientId),
        ),
      )
      .returning();
    return updated ?? null;
  },

  async markAllPatientRead(patientId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ status: "READ", readAt: new Date() })
      .where(
        and(
          eq(notifications.targetRole, "PATIENT"),
          eq(notifications.targetPatientId, patientId),
        ),
      );
  },

  // ─── Shared ────────────────────────────────────────────────────────────────

  async create(data: {
    clinicId?: string | null;
    targetRole: string;
    targetPatientId?: string | null;
    title: string;
    body: string;
    type: string;
    severity?: string;
    relatedId?: string;
    relatedType?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    const [inserted] = await db
      .insert(notifications)
      .values({
        clinicId: data.clinicId ?? null,
        targetRole: data.targetRole,
        targetPatientId: data.targetPatientId ?? null,
        title: data.title,
        body: data.body,
        type: data.type,
        severity: data.severity ?? "INFO",
        relatedId: data.relatedId,
        relatedType: data.relatedType,
        metadata: data.metadata as Record<string, unknown>,
      })
      .returning();
    return inserted;
  },
};
