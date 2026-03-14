import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../db";
import { users, patients, refreshTokens, auditLogs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "../auth/password";
import { adminUsersRepo } from "../modules/adminUsers/repos/AdminUsersRepo.drizzle";
import { getPurgeImpact } from "../modules/adminUsers/usecases/GetPurgeImpact";
import { purgeUser } from "../modules/adminUsers/usecases/PurgeUser";
import { AppError } from "../shared/errors/AppError";

// ─── Test IDs ────────────────────────────────────────────────────────────────
const SUPER_ADMIN_ID = "user-admin-001";
const MANAGER_SEED_ID = "user-manager-001";
const TEST_USER_ID = "purge-test-user-001";
const TEST_PATIENT_ID = "purge-test-patient-001";

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function createTestUser() {
  await db
    .insert(users)
    .values({
      id: TEST_USER_ID,
      email: "purge.test@example.com",
      passwordHash: await hashPassword("TestPassword123!"),
      fullName: "Purge Test User",
      role: "MANAGER",
      status: "ACTIVE",
      mustChangePassword: false,
    })
    .onConflictDoNothing();
}

async function deleteTestUser() {
  await db.delete(auditLogs).where(eq(auditLogs.actorId, TEST_USER_ID));
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, TEST_USER_ID));
  await db.delete(users).where(eq(users.id, TEST_USER_ID));
}

async function createTestPatient() {
  const clinic = await db.query.clinics.findFirst();
  if (!clinic) throw new Error("No clinic found");
  await db
    .insert(patients)
    .values({
      id: TEST_PATIENT_ID,
      patientKey: "PURGE-TEST-PAT-001",
      fullName: "Purge Test Patient",
      clinicId: clinic.id,
      status: "ACTIVE",
    })
    .onConflictDoNothing();
}

async function deleteTestPatient() {
  await db.delete(patients).where(eq(patients.id, TEST_PATIENT_ID));
}

// ─── Suite ───────────────────────────────────────────────────────────────────
describe("Purge User System", () => {
  beforeAll(async () => {
    await deleteTestUser();
    await deleteTestPatient();
    await createTestUser();
    await createTestPatient();
  });

  afterAll(async () => {
    await deleteTestUser();
    await deleteTestPatient();
  });

  // ─── T1: Self-purge impact block ───────────────────────────────────────────
  it("T1: getPurgeImpact returns BLOCKED_SELF when actor === target", async () => {
    const impact = await getPurgeImpact(SUPER_ADMIN_ID, "ADMIN", SUPER_ADMIN_ID);
    expect(impact.canPurge).toBe(false);
    expect(impact.blockedReasons).toContain("BLOCKED_SELF");
    expect(impact.target).toBeNull();
  });

  // ─── T2: Not found ─────────────────────────────────────────────────────────
  it("T2: getPurgeImpact throws NOT_FOUND for unknown user", async () => {
    await expect(
      getPurgeImpact("nonexistent-id", "MANAGER", SUPER_ADMIN_ID),
    ).rejects.toMatchObject({ code: "NOT-001" });
  });

  // ─── T3: Valid manager impact ──────────────────────────────────────────────
  it("T3: getPurgeImpact returns impact data for a valid manager", async () => {
    const impact = await getPurgeImpact(TEST_USER_ID, "MANAGER", SUPER_ADMIN_ID);
    expect(impact.target).not.toBeNull();
    expect(impact.target!.email).toBe("purge.test@example.com");
    expect(impact.target!.entityType).toBe("MANAGER");
    expect(impact.dependencies).toMatchObject({
      isPrimaryManager: false,
      invoicesPaidBy: 0,
      auditLogsActor: 0,
    });
    expect(impact.canPurge).toBe(true);
  });

  // ─── T4: purgeUser throws PURGE_BLOCKED_SELF ──────────────────────────────
  it("T4: purgeUser throws PURGE_BLOCKED_SELF when actor === target", async () => {
    await expect(
      purgeUser({
        targetId: SUPER_ADMIN_ID,
        entityType: "ADMIN",
        confirmText: "PURGE admin@demo.com",
        mode: "STRICT",
        actorId: SUPER_ADMIN_ID,
        actorRole: "SUPER_ADMIN",
      }),
    ).rejects.toMatchObject({ code: "PURGE-001" });
  });

  // ─── T5: purgeUser throws PURGE_CONFIRM_MISMATCH ──────────────────────────
  it("T5: purgeUser throws PURGE_CONFIRM_MISMATCH on wrong confirmText", async () => {
    await expect(
      purgeUser({
        targetId: TEST_USER_ID,
        entityType: "MANAGER",
        confirmText: "PURGE wrong@email.com",
        mode: "STRICT",
        actorId: SUPER_ADMIN_ID,
        actorRole: "SUPER_ADMIN",
      }),
    ).rejects.toMatchObject({ code: "PURGE-004" });
  });

  // ─── T6: purgeUser throws NOT_FOUND for unknown user ──────────────────────
  it("T6: purgeUser throws NOT_FOUND for unknown user", async () => {
    await expect(
      purgeUser({
        targetId: "unknown-id-000",
        entityType: "MANAGER",
        confirmText: "PURGE anything",
        mode: "STRICT",
        actorId: SUPER_ADMIN_ID,
        actorRole: "SUPER_ADMIN",
      }),
    ).rejects.toMatchObject({ code: "NOT-001" });
  });

  // ─── T7: Direct repo impact data shape ────────────────────────────────────
  it("T7: adminUsersRepo.getSingleUserPurgeImpact returns correct shape for MANAGER", async () => {
    const impact = await adminUsersRepo.getSingleUserPurgeImpact(TEST_USER_ID, "MANAGER");
    expect(impact).toMatchObject({
      target: expect.objectContaining({ id: TEST_USER_ID }),
      dependencies: expect.objectContaining({
        refreshTokens: expect.any(Number),
        devices: expect.any(Number),
        credentialRequests: expect.any(Number),
        notifications: expect.any(Number),
        invoicesPaidBy: expect.any(Number),
        auditLogsActor: expect.any(Number),
        isPrimaryManager: expect.any(Boolean),
      }),
      canPurge: expect.any(Boolean),
      blockedReasons: expect.any(Array),
    });
  });

  // ─── T8: Direct repo impact data shape for PATIENT ────────────────────────
  it("T8: adminUsersRepo.getSingleUserPurgeImpact returns correct shape for PATIENT", async () => {
    const impact = await adminUsersRepo.getSingleUserPurgeImpact(TEST_PATIENT_ID, "PATIENT");
    expect(impact.target).not.toBeNull();
    expect(impact.target!.entityType).toBe("PATIENT");
    expect(impact.target!.patientKey).toBe("PURGE-TEST-PAT-001");
    expect(impact.canPurge).toBe(true);
  });

  // ─── T9: STRICT mode blocks when auditLogs reference user ─────────────────
  it("T9: STRICT purge is blocked when user has audit log references", async () => {
    await db.insert(auditLogs).values({
      actorId: TEST_USER_ID,
      actorRole: "MANAGER",
      action: "TEST_ACTION",
      resourceType: "TEST",
      resourceId: TEST_USER_ID,
      ipAddress: "127.0.0.1",
      metadata: {},
    });

    try {
      const impact = await adminUsersRepo.getSingleUserPurgeImpact(TEST_USER_ID, "MANAGER");
      expect(impact.dependencies.auditLogsActor).toBeGreaterThan(0);
      expect(impact.canPurge).toBe(false);
      expect(impact.blockedReasons).toContain("BLOCKED_REFERENCES_EXIST_AUDIT");

      await expect(
        purgeUser({
          targetId: TEST_USER_ID,
          entityType: "MANAGER",
          confirmText: "PURGE purge.test@example.com",
          mode: "STRICT",
          actorId: SUPER_ADMIN_ID,
          actorRole: "SUPER_ADMIN",
        }),
      ).rejects.toMatchObject({ code: "PURGE-003" });
    } finally {
      await db.delete(auditLogs).where(eq(auditLogs.actorId, TEST_USER_ID));
    }
  });

  // ─── T10: Successful STRICT purge executes ────────────────────────────────
  it("T10: purgeUser STRICT mode succeeds for a user with no references", async () => {
    const impact = await getPurgeImpact(TEST_USER_ID, "MANAGER", SUPER_ADMIN_ID);
    expect(impact.canPurge).toBe(true);

    const result = await purgeUser({
      targetId: TEST_USER_ID,
      entityType: "MANAGER",
      confirmText: "PURGE purge.test@example.com",
      mode: "STRICT",
      actorId: SUPER_ADMIN_ID,
      actorRole: "SUPER_ADMIN",
    });

    expect(result).toEqual({ ok: true });

    const deletedUser = await db.query.users.findFirst({ where: eq(users.id, TEST_USER_ID) });
    expect(deletedUser).toBeUndefined();
  });

  // ─── T11: Successful STRICT patient purge ─────────────────────────────────
  it("T11: purgeUser STRICT mode succeeds for a patient with no references", async () => {
    const impact = await getPurgeImpact(TEST_PATIENT_ID, "PATIENT", SUPER_ADMIN_ID);
    expect(impact.canPurge).toBe(true);
    expect(impact.target!.patientKey).toBe("PURGE-TEST-PAT-001");

    const result = await purgeUser({
      targetId: TEST_PATIENT_ID,
      entityType: "PATIENT",
      confirmText: "PURGE PURGE-TEST-PAT-001",
      mode: "STRICT",
      actorId: SUPER_ADMIN_ID,
      actorRole: "SUPER_ADMIN",
    });

    expect(result).toEqual({ ok: true });

    const deletedPatient = await db.query.patients.findFirst({
      where: eq(patients.id, TEST_PATIENT_ID),
    });
    expect(deletedPatient).toBeUndefined();
  });
});
