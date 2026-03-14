import { db } from "../../../db";
import { jobRuns } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface JobRunRecord {
  jobName: string;
  status: "SUCCESS" | "FAILED";
  startedAt: Date;
  finishedAt: Date;
  errorMessageSafe?: string | null;
}

export async function insertJobRun(record: JobRunRecord): Promise<void> {
  await db.insert(jobRuns).values({
    jobName: record.jobName,
    status: record.status,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    errorMessageSafe: record.errorMessageSafe ?? null,
  });
}

export interface JobLastRun {
  jobName: string;
  status: "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string;
  errorMessageSafe: string | null;
}

export async function getLatestRunPerJob(jobNames: string[]): Promise<Record<string, JobLastRun>> {
  const result: Record<string, JobLastRun> = {};
  for (const name of jobNames) {
    const row = await db.query.jobRuns.findFirst({
      where: eq(jobRuns.jobName, name),
      orderBy: desc(jobRuns.createdAt),
    });
    if (row) {
      result[name] = {
        jobName: row.jobName,
        status: row.status,
        startedAt: row.startedAt.toISOString(),
        finishedAt: row.finishedAt.toISOString(),
        errorMessageSafe: row.errorMessageSafe,
      };
    }
  }
  return result;
}
