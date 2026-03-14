import { db } from "../../../db";
import type { DrizzleTx } from "../../../tx/TransactionManager";
import {
  users,
  patients,
  clinics,
  refreshTokens,
  devices,
  credentialRequests,
  appointments,
  patientDocuments,
  patientPlans,
  invoices,
  auditLogs,
  notifications,
} from "@shared/schema";
import { count, eq, inArray, isNotNull, or } from "drizzle-orm";

export type PurgeMode = "STRICT" | "ANONYMIZE";

export interface PurgeImpact {
  target: {
    id: string;
    entityType: "ADMIN" | "MANAGER" | "PATIENT";
    email: string | null;
    displayName: string | null;
    patientKey: string | null;
    role: string | null;
    clinicId: string | null;
  } | null;
  dependencies: {
    refreshTokens: number;
    devices: number;
    credentialRequests: number;
    notifications: number;
    invoicesPaidBy: number;
    auditLogsActor: number;
    isPrimaryManager: boolean;
  };
  canPurge: boolean;
  blockedReasons: string[];
}

export const adminUsersRepo = {
  async getPrimaryManagerUserIds(): Promise<Set<string>> {
    const rows = await db
      .select({ primaryManagerUserId: clinics.primaryManagerUserId })
      .from(clinics)
      .where(isNotNull(clinics.primaryManagerUserId));

    return new Set(
      rows
        .map((r) => r.primaryManagerUserId)
        .filter((id): id is string => id !== null),
    );
  },

  async getUserIdsWithPaidInvoices(): Promise<Set<string>> {
    const rows = await db
      .select({ paidByUserId: invoices.paidByUserId })
      .from(invoices)
      .where(isNotNull(invoices.paidByUserId));

    return new Set(
      rows
        .map((r) => r.paidByUserId)
        .filter((id): id is string => id !== null),
    );
  },

  async getUsersByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return db.query.users.findMany({
      where: inArray(users.id, ids),
    });
  },

  async getPatientsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return db.query.patients.findMany({
      where: inArray(patients.id, ids),
    });
  },

  async deactivateUsers(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db
      .update(users)
      .set({ status: "INACTIVE" })
      .where(inArray(users.id, ids))
      .returning({ id: users.id });
    return result.length;
  },

  async deactivatePatients(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db
      .update(patients)
      .set({ status: "INACTIVE" })
      .where(inArray(patients.id, ids))
      .returning({ id: patients.id });
    return result.length;
  },

  async deactivateBothInTransaction(
    userIds: string[],
    patientIds: string[],
  ): Promise<{ users: number; patients: number }> {
    return db.transaction(async (trx: DrizzleTx) => {
      let userCount = 0;
      let patientCount = 0;

      if (userIds.length > 0) {
        const r = await trx
          .update(users)
          .set({ status: "INACTIVE" })
          .where(inArray(users.id, userIds))
          .returning({ id: users.id });
        userCount = r.length;
      }

      if (patientIds.length > 0) {
        const r = await trx
          .update(patients)
          .set({ status: "INACTIVE" })
          .where(inArray(patients.id, patientIds))
          .returning({ id: patients.id });
        patientCount = r.length;
      }

      return { users: userCount, patients: patientCount };
    });
  },

  async purgeInTransaction(
    userIds: string[],
    patientIds: string[],
  ): Promise<number> {
    return db.transaction(async (trx: DrizzleTx) => {
      let purged = 0;

      if (userIds.length > 0) {
        await trx
          .delete(refreshTokens)
          .where(inArray(refreshTokens.userId, userIds));

        await trx
          .delete(credentialRequests)
          .where(
            or(
              inArray(credentialRequests.targetUserId, userIds),
              inArray(credentialRequests.resolvedByAdminId, userIds),
            ),
          );

        await trx
          .update(invoices)
          .set({ paidByUserId: null })
          .where(inArray(invoices.paidByUserId, userIds));

        const deleted = await trx
          .delete(users)
          .where(inArray(users.id, userIds))
          .returning({ id: users.id });
        purged += deleted.length;
      }

      if (patientIds.length > 0) {
        await trx
          .delete(refreshTokens)
          .where(inArray(refreshTokens.patientId, patientIds));

        await trx
          .delete(devices)
          .where(inArray(devices.patientId, patientIds));

        await trx
          .delete(credentialRequests)
          .where(inArray(credentialRequests.targetPatientId, patientIds));

        await trx
          .delete(appointments)
          .where(inArray(appointments.patientId, patientIds));

        await trx
          .delete(patientDocuments)
          .where(inArray(patientDocuments.patientId, patientIds));

        await trx
          .delete(patientPlans)
          .where(inArray(patientPlans.patientId, patientIds));

        const deleted = await trx
          .delete(patients)
          .where(inArray(patients.id, patientIds))
          .returning({ id: patients.id });
        purged += deleted.length;
      }

      return purged;
    });
  },

  async getSingleUserPurgeImpact(
    id: string,
    entityType: "ADMIN" | "MANAGER" | "PATIENT",
  ): Promise<PurgeImpact> {
    if (entityType === "PATIENT") {
      const patient = await db.query.patients.findFirst({
        where: eq(patients.id, id),
      });
      if (!patient) {
        return {
          target: null,
          dependencies: { refreshTokens: 0, devices: 0, credentialRequests: 0, notifications: 0, invoicesPaidBy: 0, auditLogsActor: 0, isPrimaryManager: false },
          canPurge: false,
          blockedReasons: ["NOT_FOUND"],
        };
      }
      const [rtRows, devRows, crRows, notifRows] = await Promise.all([
        db.select({ n: count() }).from(refreshTokens).where(eq(refreshTokens.patientId, id)),
        db.select({ n: count() }).from(devices).where(eq(devices.patientId, id)),
        db.select({ n: count() }).from(credentialRequests).where(eq(credentialRequests.targetPatientId, id)),
        db.select({ n: count() }).from(notifications).where(eq(notifications.relatedId, id)),
      ]);
      return {
        target: { id, entityType, email: null, displayName: patient.fullName ?? null, patientKey: patient.patientKey, role: null, clinicId: patient.clinicId ?? null },
        dependencies: {
          refreshTokens: rtRows[0].n,
          devices: devRows[0].n,
          credentialRequests: crRows[0].n,
          notifications: notifRows[0].n,
          invoicesPaidBy: 0,
          auditLogsActor: 0,
          isPrimaryManager: false,
        },
        canPurge: true,
        blockedReasons: [],
      };
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!user) {
      return {
        target: null,
        dependencies: { refreshTokens: 0, devices: 0, credentialRequests: 0, notifications: 0, invoicesPaidBy: 0, auditLogsActor: 0, isPrimaryManager: false },
        canPurge: false,
        blockedReasons: ["NOT_FOUND"],
      };
    }

    const [rtRows, crRows, invRows, alRows, notifRows] = await Promise.all([
      db.select({ n: count() }).from(refreshTokens).where(eq(refreshTokens.userId, id)),
      db.select({ n: count() }).from(credentialRequests).where(
        or(eq(credentialRequests.targetUserId, id), eq(credentialRequests.resolvedByAdminId, id))!
      ),
      db.select({ n: count() }).from(invoices).where(eq(invoices.paidByUserId, id)),
      db.select({ n: count() }).from(auditLogs).where(eq(auditLogs.actorId, id)),
      db.select({ n: count() }).from(notifications).where(eq(notifications.relatedId, id)),
    ]);

    const primaryManagerClinic = await db.query.clinics.findFirst({
      where: eq(clinics.primaryManagerUserId, id),
    });
    const isPrimaryManager = !!primaryManagerClinic;

    const invoicesCount = invRows[0].n;
    const auditLogsCount = alRows[0].n;

    const blockedReasons: string[] = [];
    if (isPrimaryManager) blockedReasons.push("PRIMARY_MANAGER_DELETE_BLOCKED");
    if (invoicesCount > 0) blockedReasons.push("BLOCKED_REFERENCES_EXIST_INVOICES");
    if (auditLogsCount > 0) blockedReasons.push("BLOCKED_REFERENCES_EXIST_AUDIT");

    return {
      target: { id, entityType, email: user.email, displayName: user.fullName ?? null, patientKey: null, role: user.role, clinicId: user.clinicId ?? null },
      dependencies: {
        refreshTokens: rtRows[0].n,
        devices: 0,
        credentialRequests: crRows[0].n,
        notifications: notifRows[0].n,
        invoicesPaidBy: invoicesCount,
        auditLogsActor: auditLogsCount,
        isPrimaryManager,
      },
      canPurge: blockedReasons.length === 0,
      blockedReasons,
    };
  },

  async purgeSingleUserInTransaction(
    id: string,
    entityType: "ADMIN" | "MANAGER" | "PATIENT",
    mode: PurgeMode,
  ): Promise<void> {
    await db.transaction(async (trx: DrizzleTx) => {
      if (entityType === "PATIENT") {
        await trx.delete(refreshTokens).where(eq(refreshTokens.patientId, id));
        await trx.delete(devices).where(eq(devices.patientId, id));
        await trx.delete(credentialRequests).where(eq(credentialRequests.targetPatientId, id));
        await trx.delete(appointments).where(eq(appointments.patientId, id));
        await trx.delete(patientDocuments).where(eq(patientDocuments.patientId, id));
        await trx.delete(patientPlans).where(eq(patientPlans.patientId, id));
        await trx.delete(patients).where(eq(patients.id, id));
        return;
      }

      await trx.delete(refreshTokens).where(eq(refreshTokens.userId, id));

      await trx.delete(credentialRequests).where(
        or(eq(credentialRequests.targetUserId, id), eq(credentialRequests.resolvedByAdminId, id))!
      );

      if (mode === "ANONYMIZE") {
        await trx.update(invoices).set({ paidByUserId: null }).where(eq(invoices.paidByUserId, id));
        await trx.update(auditLogs).set({ actorId: "SYSTEM_PURGED" }).where(eq(auditLogs.actorId, id));
      }

      await trx.delete(users).where(eq(users.id, id));
    });
  },
};
