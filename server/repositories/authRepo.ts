import { db } from "../db";
import { users, refreshTokens, devices, patients } from "@shared/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";
import { hashPassword } from "../auth/password";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const authRepo = {
  async findUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
  },

  async findUserById(id: string) {
    return await db.query.users.findFirst({
      where: eq(users.id, id),
    });
  },

  async findPatientById(id: string) {
    return await db.query.patients.findFirst({
      where: eq(patients.id, id),
    });
  },

  async storeRefreshToken(opts: {
    userId?: string;
    patientId?: string;
    token: string;
    expiresAt: Date;
  }) {
    const tokenHash = hashToken(opts.token);
    await db.insert(refreshTokens).values({
      userId: opts.userId,
      patientId: opts.patientId,
      tokenHash,
      expiresAt: opts.expiresAt,
    });
  },

  async findActiveRefreshToken(token: string) {
    const tokenHash = hashToken(token);
    return await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    });
  },

  async revokeRefreshToken(token: string) {
    const tokenHash = hashToken(token);
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  },

  async revokeAllRefreshTokensForUser(userId: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  },

  async revokeAllRefreshTokensForPatient(patientId: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.patientId, patientId), isNull(refreshTokens.revokedAt)));
  },

  async getActiveDeviceForPatient(patientId: string) {
    return await db.query.devices.findFirst({
      where: and(eq(devices.patientId, patientId), isNull(devices.revokedAt)),
    });
  },

  /**
   * Bind a device to a patient on their first successful login.
   * Records the device identifier, bind timestamp, and optional platform.
   */
  async bindDevice(patientId: string, deviceId: string, platform?: string) {
    await db.insert(devices).values({
      patientId,
      deviceId,
      platform: platform ?? null,
    });
  },

  /**
   * Update the last-seen timestamp for the patient's active device.
   * Called on every successful login to keep an accurate audit trail.
   */
  async updateDeviceLastSeen(patientId: string) {
    await db
      .update(devices)
      .set({ lastSeenAt: new Date() })
      .where(and(eq(devices.patientId, patientId), isNull(devices.revokedAt)));
  },

  /**
   * Revoke the active device binding for a patient AND invalidate all their
   * existing refresh tokens. This ensures the old device cannot continue
   * using a cached session after an authorized reset.
   */
  async revokeDevice(patientId: string) {
    await db
      .update(devices)
      .set({ revokedAt: new Date() })
      .where(and(eq(devices.patientId, patientId), isNull(devices.revokedAt)));

    // Invalidate all active sessions so the old device loses access immediately.
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.patientId, patientId), isNull(refreshTokens.revokedAt)));
  },

  async updateLastLogin(userId: string, ip?: string) {
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), ...(ip ? { lastLoginIp: ip } : {}) })
      .where(eq(users.id, userId));
  },

  async updatePassword(userId: string, newPassword: string) {
    const passwordHash = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(users.id, userId));
  },
};
