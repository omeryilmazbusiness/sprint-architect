import { db } from "../../../db";
import type { DrizzleTx } from "../../../tx/TransactionManager";
import {
  patients,
  refreshTokens,
  devices,
  credentialRequests,
  appointments,
  patientDocuments,
  patientPlans,
  billingEvents,
  notifications,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { getStorageProvider } from "../../../storage/getStorageProvider";
import { logger } from "../../../shared/logger";

export async function collectGuestStorageKeys(patientId: string): Promise<string[]> {
  const docs = await db.query.patientDocuments.findMany({
    where: eq(patientDocuments.patientId, patientId),
    columns: { fileUrl: true },
  });
  return docs.map((d) => d.fileUrl).filter((k): k is string => !!k?.trim());
}

export async function deleteGuestStorageFiles(keys: string[]): Promise<void> {
  const storage = getStorageProvider();
  for (const key of keys) {
    try {
      await storage.deleteFile(key);
    } catch (err: unknown) {
      logger.warn("[guest-retention] Storage delete failed (continuing)", {
        storageKey: key,
        error: err instanceof Error ? err.message.slice(0, 120) : "unknown",
      });
    }
  }
}

export async function purgeGuestOperationalDataInTransaction(
  trx: DrizzleTx,
  patientId: string,
  purgedAt: Date
): Promise<void> {
  await trx
    .update(patients)
    .set({ retentionPurgedAt: purgedAt })
    .where(eq(patients.id, patientId));

  await trx.delete(notifications).where(eq(notifications.targetPatientId, patientId));
  await trx.delete(refreshTokens).where(eq(refreshTokens.patientId, patientId));
  await trx.delete(devices).where(eq(devices.patientId, patientId));
  await trx.delete(credentialRequests).where(eq(credentialRequests.targetPatientId, patientId));
  await trx.delete(appointments).where(eq(appointments.patientId, patientId));
  await trx.delete(patientDocuments).where(eq(patientDocuments.patientId, patientId));
  await trx.delete(patientPlans).where(eq(patientPlans.patientId, patientId));
  await trx.delete(billingEvents).where(eq(billingEvents.patientId, patientId));
  await trx.delete(patients).where(eq(patients.id, patientId));
}
