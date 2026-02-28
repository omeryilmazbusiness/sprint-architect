import { db } from "../db";
import { users, refreshTokens, devices, patients } from "@shared/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import crypto from "crypto";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export const authRepo = {
  async findUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
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
        gt(refreshTokens.expiresAt, new Date())
      ),
    });
  },

  async revokeRefreshToken(token: string) {
    const tokenHash = hashToken(token);
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  },

  async revokeAllRefreshTokensForUser(userId: string) {
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  },

  async revokeAllRefreshTokensForPatient(patientId: string) {
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.patientId, patientId), isNull(refreshTokens.revokedAt)));
  },

  async getActiveDeviceForPatient(patientId: string) {
    return await db.query.devices.findFirst({
      where: and(eq(devices.patientId, patientId), isNull(devices.revokedAt)),
    });
  },

  async bindDevice(patientId: string, deviceId: string) {
    await db.insert(devices).values({
      patientId,
      deviceId,
    });
  },

  async revokeDevice(patientId: string) {
    await db.update(devices)
      .set({ revokedAt: new Date() })
      .where(and(eq(devices.patientId, patientId), isNull(devices.revokedAt)));
  },
};
