import { db } from "../db";
import { deviceTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export type DeviceToken = typeof deviceTokens.$inferSelect;

export const deviceTokenRepo = {
  async upsert(data: {
    userId: string;
    role: string;
    clinicId?: string | null;
    token: string;
    platform: string;
  }): Promise<void> {
    await db
      .insert(deviceTokens)
      .values({
        userId: data.userId,
        role: data.role,
        clinicId: data.clinicId ?? null,
        token: data.token,
        platform: data.platform,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: deviceTokens.token,
        set: {
          userId: data.userId,
          role: data.role,
          clinicId: data.clinicId ?? null,
          platform: data.platform,
          lastSeenAt: new Date(),
        },
      });
  },

  async findByRole(role: string): Promise<DeviceToken[]> {
    return db.query.deviceTokens.findMany({
      where: eq(deviceTokens.role, role),
    });
  },

  async findByClinicAndRole(clinicId: string, role: string): Promise<DeviceToken[]> {
    return db.query.deviceTokens.findMany({
      where: and(eq(deviceTokens.clinicId, clinicId), eq(deviceTokens.role, role)),
    });
  },

  async delete(token: string): Promise<void> {
    await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
  },
};
