import { db } from "../../../db";
import { logger } from "../../../shared/logger";
import {
  collectGuestStorageKeys,
  deleteGuestStorageFiles,
  purgeGuestOperationalDataInTransaction,
} from "../repos/GuestOperationalPurger.drizzle";

export interface PurgeGuestOperationalDataInput {
  patientId: string;
  clinicId: string;
}

export class PurgeGuestOperationalData {
  async execute(input: PurgeGuestOperationalDataInput): Promise<{ purged: true }> {
    const keys = await collectGuestStorageKeys(input.patientId);
    await deleteGuestStorageFiles(keys);

    const purgedAt = new Date();
    await db.transaction(async (trx) => {
      await purgeGuestOperationalDataInTransaction(trx, input.patientId, purgedAt);
    });

    logger.info("[guest-retention] Guest operational data purged", {
      patientId: input.patientId,
      clinicId: input.clinicId,
      fileCount: keys.length,
    });
    return { purged: true };
  }
}

export const purgeGuestOperationalData = new PurgeGuestOperationalData();
