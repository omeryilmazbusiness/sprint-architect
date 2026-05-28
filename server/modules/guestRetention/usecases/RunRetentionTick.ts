import { getArchiveLeadHours } from "../retentionConfig";
import type { IGuestRetentionReadRepo } from "../ports/IGuestRetentionReadRepo";
import { guestRetentionReadRepo } from "../repos/GuestRetentionReadRepo.drizzle";
import { SendPrePurgeArchiveEmail } from "./SendPrePurgeArchiveEmail";
import { PurgeGuestOperationalData } from "./PurgeGuestOperationalData";
import { logger } from "../../../shared/logger";

export interface RetentionTickResult {
  archiveAttempted: number;
  archiveSent: number;
  archiveFailed: number;
  purgeAttempted: number;
  purgeCompleted: number;
  purgeFailed: number;
  dryRun?: {
    archiveIds: string[];
    purgeIds: string[];
  };
}

export class RunRetentionTick {
  constructor(
    private readonly repo: IGuestRetentionReadRepo = guestRetentionReadRepo,
    private readonly sendArchive = new SendPrePurgeArchiveEmail(),
    private readonly purge = new PurgeGuestOperationalData()
  ) {}

  async execute(opts?: { dryRun?: boolean }): Promise<RetentionTickResult> {
    const now = new Date();
    const leadMs = getArchiveLeadHours() * 3600_000;
    const archiveCandidates = await this.repo.findDueForArchive(now, leadMs);
    const purgeCandidates = await this.repo.findDueForPurge(now);

    if (opts?.dryRun) {
      return {
        archiveAttempted: 0,
        archiveSent: 0,
        archiveFailed: 0,
        purgeAttempted: 0,
        purgeCompleted: 0,
        purgeFailed: 0,
        dryRun: {
          archiveIds: archiveCandidates.map((c) => c.id),
          purgeIds: purgeCandidates.map((c) => c.id),
        },
      };
    }

    let archiveSent = 0;
    let archiveFailed = 0;
    for (const c of archiveCandidates) {
      try {
        await this.sendArchive.execute({ patientId: c.id, clinicId: c.clinicId });
        archiveSent++;
      } catch (err: unknown) {
        archiveFailed++;
        logger.error("[guest-retention] Archive send failed", {
          patientId: c.id,
          error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
        });
      }
    }

    let purgeCompleted = 0;
    let purgeFailed = 0;
    for (const c of purgeCandidates) {
      try {
        await this.purge.execute({ patientId: c.id, clinicId: c.clinicId });
        purgeCompleted++;
      } catch (err: unknown) {
        purgeFailed++;
        logger.error("[guest-retention] Purge failed", {
          patientId: c.id,
          error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
        });
      }
    }

    return {
      archiveAttempted: archiveCandidates.length,
      archiveSent,
      archiveFailed,
      purgeAttempted: purgeCandidates.length,
      purgeCompleted,
      purgeFailed,
    };
  }
}

export const runRetentionTick = new RunRetentionTick();
