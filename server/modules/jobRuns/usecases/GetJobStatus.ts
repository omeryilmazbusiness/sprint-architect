import { getLatestRunPerJob, type JobLastRun } from "../repos/JobRunsRepo.drizzle";

const ISTANBUL_TZ = "Europe/Istanbul";

const JOBS = [
  {
    name: "job_a_generate_invoices",
    label: "Invoice Creation",
    schedule: "09:00 on last day of month",
    description: "Generates PENDING invoices and emails clinics",
  },
  {
    name: "job_b_mark_overdue",
    label: "Pending → Unpaid Rollover",
    schedule: "00:00 daily",
    description: "Marks overdue PENDING invoices as UNPAID and suspends clinics",
  },
  {
    name: "job_c_monthly_report",
    label: "Monthly Status Report",
    schedule: "00:00 on 1st of month",
    description: "Sends monthly billing status report email",
  },
];

function computeNextRun(jobName: string): string {
  const now = new Date();
  const nowIstanbul = new Intl.DateTimeFormat("en-US", {
    timeZone: ISTANBUL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const year = parseInt(nowIstanbul.find((p) => p.type === "year")?.value ?? "2024");
  const month = parseInt(nowIstanbul.find((p) => p.type === "month")?.value ?? "1");
  const day = parseInt(nowIstanbul.find((p) => p.type === "day")?.value ?? "1");
  const hour = parseInt(nowIstanbul.find((p) => p.type === "hour")?.value ?? "0");

  if (jobName === "job_a_generate_invoices") {
    const lastDay = new Date(year, month, 0).getDate();
    if (day < lastDay || (day === lastDay && hour < 9)) {
      return new Date(year, month - 1, lastDay, 9, 0, 0).toISOString();
    }
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const nextLastDay = new Date(nextYear, nextMonth, 0).getDate();
    return new Date(nextYear, nextMonth - 1, nextLastDay, 9, 0, 0).toISOString();
  }

  if (jobName === "job_b_mark_overdue") {
    const tomorrow = new Date(year, month - 1, day + 1, 0, 0, 0);
    return tomorrow.toISOString();
  }

  if (jobName === "job_c_monthly_report") {
    if (day < 1 || (day === 1 && hour < 0)) {
      return new Date(year, month - 1, 1, 0, 0, 0).toISOString();
    }
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return new Date(nextYear, nextMonth - 1, 1, 0, 0, 0).toISOString();
  }

  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

export interface JobStatusEntry {
  name: string;
  label: string;
  schedule: string;
  description: string;
  lastRunAt: string | null;
  lastRunStatus: "SUCCESS" | "FAILED" | null;
  lastRunErrorSafe: string | null;
  nextRunAt: string;
}

export async function executeGetJobStatus(): Promise<{ timezone: string; jobs: JobStatusEntry[] }> {
  const jobNames = JOBS.map((j) => j.name);
  const lastRuns = await getLatestRunPerJob(jobNames);

  const jobs: JobStatusEntry[] = JOBS.map((j) => {
    const last: JobLastRun | undefined = lastRuns[j.name];
    return {
      name: j.name,
      label: j.label,
      schedule: j.schedule,
      description: j.description,
      lastRunAt: last?.finishedAt ?? null,
      lastRunStatus: last?.status ?? null,
      lastRunErrorSafe: last?.errorMessageSafe ?? null,
      nextRunAt: computeNextRun(j.name),
    };
  });

  return { timezone: ISTANBUL_TZ, jobs };
}
