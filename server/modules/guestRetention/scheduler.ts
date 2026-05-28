import { insertJobRun } from "../jobRuns/repos/JobRunsRepo.drizzle";
import { logger } from "../../shared/logger";
import { runRetentionTick } from "./usecases/RunRetentionTick";

const TICK_MS = 15 * 60 * 1000;
const JOB_NAME = "guest_retention_tick";

function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message.slice(0, 200);
  }
  return "Unknown error";
}

export function startGuestRetentionScheduler(): void {
  logger.info("[guest-retention] Scheduler started (15 min interval)", { jobName: JOB_NAME });

  const run = async () => {
    const startedAt = new Date();
    try {
      const result = await runRetentionTick.execute();
      const finishedAt = new Date();
      logger.info("[guest-retention] Tick completed", { ...result, durationMs: finishedAt.getTime() - startedAt.getTime() });
      await insertJobRun({ jobName: JOB_NAME, status: "SUCCESS", startedAt, finishedAt });
    } catch (err) {
      const finishedAt = new Date();
      const errMsg = sanitizeError(err);
      logger.error("[guest-retention] Tick failed", { error: errMsg });
      await insertJobRun({
        jobName: JOB_NAME,
        status: "FAILED",
        startedAt,
        finishedAt,
        errorMessageSafe: errMsg,
      }).catch(() => {});
    }
  };

  run().catch((err: unknown) =>
    logger.error("[guest-retention] Initial tick error", { error: sanitizeError(err) })
  );
  setInterval(() => {
    run().catch((err: unknown) =>
      logger.error("[guest-retention] Scheduled tick error", { error: sanitizeError(err) })
    );
  }, TICK_MS);
}
