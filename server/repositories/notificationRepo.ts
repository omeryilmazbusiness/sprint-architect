import { db } from "../db";
import { notifications, type Notification } from "@shared/schema";
import { eq, and, desc, count, isNull } from "drizzle-orm";

export const notificationRepo = {
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
    return updated || null;
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
    return updated || null;
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

  async create(data: {
    clinicId?: string | null;
    targetRole: string;
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
        title: data.title,
        body: data.body,
        type: data.type,
        severity: data.severity ?? "INFO",
        relatedId: data.relatedId,
        relatedType: data.relatedType,
        metadata: data.metadata as any,
      })
      .returning();
    return inserted;
  },
};
