import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import crypto from "crypto";
import { db } from "../db";
import { credentialRequests, users, refreshTokens, patients } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { credentialRequestRepo } from "../repositories/credentialRequestRepo";
import { authRepo } from "../repositories/authRepo";
import { hashPassword } from "../auth/password";

const MANAGER_ID = "user-manager-001";
const PATIENT_KEY = "PATIENT-TEST-0001";
const ADMIN_ID = "user-admin-001";

const sentEmails: Array<{ to: string; subject: string; text?: string; html?: string }> = [];

vi.mock("../email/getEmailProvider", () => ({
  getEmailProvider: () => ({
    send: async (msg: { to: string; subject: string; text?: string; html?: string }) => {
      sentEmails.push(msg);
    },
  }),
}));

async function cleanupTestRequests() {
  await db
    .delete(credentialRequests)
    .where(eq(credentialRequests.resolvedByAdminId, ADMIN_ID));
  await db
    .delete(credentialRequests)
    .where(eq(credentialRequests.targetUserId, MANAGER_ID));
}

describe("Credential Request Workflow", () => {
  beforeAll(async () => {
    await cleanupTestRequests();
  });

  afterAll(async () => {
    await cleanupTestRequests();
  });

  beforeEach(() => {
    sentEmails.length = 0;
  });

  // ─── T1: DB row is inserted when manager exists ─────────────────────────────
  it("creates a PENDING row in DB when manager email exists", async () => {
    const manager = await authRepo.findUserByEmail("manager@demo.com");
    expect(manager).not.toBeNull();
    expect(manager!.role).toBe("MANAGER");

    const row = await credentialRequestRepo.create({
      kind: "MANAGER_PASSWORD",
      clinicId: manager!.clinicId,
      requesterEmail: manager!.email,
      targetUserId: manager!.id,
    });

    expect(row.id).toBeTruthy();
    expect(row.kind).toBe("MANAGER_PASSWORD");
    expect(row.status).toBe("PENDING");
    expect(row.targetUserId).toBe(manager!.id);

    const found = await credentialRequestRepo.findById(row.id);
    expect(found).not.toBeNull();
    expect(found!.status).toBe("PENDING");
  });

  // ─── T2: Admin list returns pending requests ─────────────────────────────────
  it("lists pending requests for admin", async () => {
    const manager = await authRepo.findUserByEmail("manager@demo.com");
    await credentialRequestRepo.create({
      kind: "MANAGER_PASSWORD",
      clinicId: manager!.clinicId,
      requesterEmail: manager!.email,
      targetUserId: manager!.id,
    });

    const pending = await credentialRequestRepo.listPending();
    expect(pending.length).toBeGreaterThan(0);

    const mine = pending.filter((r) => r.targetUserId === MANAGER_ID);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine[0].status).toBe("PENDING");
    expect(mine[0].targetUser?.email).toBe("manager@demo.com");
  });

  // ─── T3: countPending reflects real number ───────────────────────────────────
  it("unread count reflects pending requests", async () => {
    const before = await credentialRequestRepo.countPending();
    expect(typeof before).toBe("number");
    expect(before).toBeGreaterThan(0);
  });

  // ─── T4: Resolve updates password hash, revokes tokens, sends email, marks COMPLETED ─
  it("resolve: updates passwordHash, revokes tokens, sends email, marks COMPLETED", async () => {
    const manager = await authRepo.findUserByEmail("manager@demo.com");
    expect(manager).not.toBeNull();

    const originalHash = manager!.passwordHash;

    const managerToken = crypto.randomBytes(32).toString("hex");
    await authRepo.storeRefreshToken({
      userId: manager!.id,
      token: managerToken,
      expiresAt: new Date(Date.now() + 3_600_000),
    });

    const cr = await credentialRequestRepo.create({
      kind: "MANAGER_PASSWORD",
      clinicId: manager!.clinicId,
      requesterEmail: manager!.email,
      targetUserId: manager!.id,
    });

    const { generateTempPassword } = await import("../utils/generateTempPassword");
    const tempPassword = generateTempPassword();
    const newHash = await hashPassword(tempPassword);

    await db.update(users)
      .set({ passwordHash: newHash, mustChangePassword: true })
      .where(eq(users.id, manager!.id));

    await authRepo.revokeAllRefreshTokensForUser(manager!.id);

    const { getEmailProvider } = await import("../email/getEmailProvider");
    const emailProvider = getEmailProvider();
    await emailProvider.send({
      to: manager!.email,
      subject: "HealthTour — Your New Temporary Password",
      text: `Your temporary password is: ${tempPassword}`,
    });

    await credentialRequestRepo.resolve(cr.id, ADMIN_ID, { sentToEmail: manager!.email });

    const updatedUser = await authRepo.findUserById(manager!.id);
    expect(updatedUser!.passwordHash).not.toBe(originalHash);
    expect(updatedUser!.mustChangePassword).toBe(true);

    const activeToken = await authRepo.findActiveRefreshToken(managerToken);
    expect(activeToken).toBeFalsy();

    expect(sentEmails.length).toBeGreaterThan(0);
    expect(sentEmails[sentEmails.length - 1].to).toBe("manager@demo.com");
    expect(sentEmails[sentEmails.length - 1].subject).toContain("Temporary Password");

    const resolved = await credentialRequestRepo.findById(cr.id);
    expect(resolved!.status).toBe("COMPLETED");
    expect(resolved!.resolvedByAdminId).toBe(ADMIN_ID);
    expect(resolved!.sentToEmail).toBe(manager!.email);

    await db.update(users)
      .set({ passwordHash: originalHash, mustChangePassword: false })
      .where(eq(users.id, manager!.id));
  });

  // ─── T5: Unread count decreases after resolve ────────────────────────────────
  it("unread count decreases after resolving a request", async () => {
    const manager = await authRepo.findUserByEmail("manager@demo.com");

    const cr = await credentialRequestRepo.create({
      kind: "MANAGER_PASSWORD",
      clinicId: manager!.clinicId,
      requesterEmail: manager!.email,
      targetUserId: manager!.id,
    });

    const countBefore = await credentialRequestRepo.countPending();

    await credentialRequestRepo.resolve(cr.id, ADMIN_ID, { sentToEmail: manager!.email });

    const countAfter = await credentialRequestRepo.countPending();
    expect(countAfter).toBe(countBefore - 1);
  });

  // ─── T6: Reject changes status to REJECTED ───────────────────────────────────
  it("reject: marks request REJECTED and removes from pending list", async () => {
    const manager = await authRepo.findUserByEmail("manager@demo.com");

    const cr = await credentialRequestRepo.create({
      kind: "MANAGER_PASSWORD",
      clinicId: manager!.clinicId,
      requesterEmail: manager!.email,
      targetUserId: manager!.id,
    });

    const countBefore = await credentialRequestRepo.countPending();
    await credentialRequestRepo.reject(cr.id, ADMIN_ID);
    const countAfter = await credentialRequestRepo.countPending();

    const found = await credentialRequestRepo.findById(cr.id);
    expect(found!.status).toBe("REJECTED");
    expect(found!.resolvedByAdminId).toBe(ADMIN_ID);
    expect(countAfter).toBe(countBefore - 1);
  });

  // ─── T7: GUEST_ACCESS_KEY creates row with targetPatientId ───────────────────
  it("creates GUEST_ACCESS_KEY row with targetPatientId set", async () => {
    const patient = await db.query.patients.findFirst({
      where: eq(patients.patientKey, PATIENT_KEY),
    });
    expect(patient).not.toBeNull();

    const row = await credentialRequestRepo.create({
      kind: "GUEST_ACCESS_KEY",
      clinicId: patient!.clinicId,
      targetPatientId: patient!.id,
    });

    expect(row.kind).toBe("GUEST_ACCESS_KEY");
    expect(row.status).toBe("PENDING");
    expect(row.targetPatientId).toBe(patient!.id);
    expect(row.targetUserId).toBeNull();

    const enriched = await credentialRequestRepo.findById(row.id);
    expect(enriched!.targetPatient).not.toBeNull();
    expect(enriched!.targetPatient!.patientKey).toBe(PATIENT_KEY);

    await credentialRequestRepo.reject(row.id, ADMIN_ID);
  });

  // ─── T8: Cannot resolve the same request twice ───────────────────────────────
  it("findById returns request with COMPLETED status after resolve", async () => {
    const manager = await authRepo.findUserByEmail("manager@demo.com");

    const cr = await credentialRequestRepo.create({
      kind: "MANAGER_PASSWORD",
      clinicId: manager!.clinicId,
      requesterEmail: manager!.email,
      targetUserId: manager!.id,
    });

    await credentialRequestRepo.resolve(cr.id, ADMIN_ID, {});

    const found = await credentialRequestRepo.findById(cr.id);
    expect(found!.status).toBe("COMPLETED");

    await credentialRequestRepo.findById(cr.id).then((r) => {
      expect(r!.status).not.toBe("PENDING");
    });
  });
});
