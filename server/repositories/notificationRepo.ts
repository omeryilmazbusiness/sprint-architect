import { db } from "../db";
import { notifications, type Notification } from "@shared/schema";
import { eq, and, desc, count } from "drizzle-orm";

export const notificationRepo = {
  async getUnreadCount(clinicId: string): Promise<number> {
    const [result] = await db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.clinicId, clinicId),
          eq(notifications.status, "UNREAD"),
          eq(notifications.targetRole, "MANAGER")
        )
      );
    return result.value;
  },

  async list(clinicId: string, status?: "UNREAD" | "READ", limit?: number): Promise<Notification[]> {
    const whereClause = [
      eq(notifications.clinicId, clinicId),
      eq(notifications.targetRole, "MANAGER")
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
      .set({ status: "READ" })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.clinicId, clinicId),
          eq(notifications.targetRole, "MANAGER")
        )
      )
      .returning();
    return updated || null;
  },

  async markAllRead(clinicId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ status: "READ" })
      .where(
        and(
          eq(notifications.clinicId, clinicId),
          eq(notifications.targetRole, "MANAGER")
        )
      );
  },

  async create(data: {
    clinicId: string;
    targetRole: string;
    title: string;
    body: string;
    type: string;
    relatedId?: string;
    relatedType?: string;
  }): Promise<Notification> {
    const [inserted] = await db.insert(notifications).values(data).returning();
    return inserted;
  },
};
