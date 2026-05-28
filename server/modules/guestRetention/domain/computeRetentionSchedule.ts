import {
  getArchiveLeadHours,
  getRetentionTimeZone,
  getSelfDeleteDelayHours,
} from "../retentionConfig";

export type RetentionSource = "DEPARTURE" | "SELF_DELETE";

export interface DepartureRetentionFields {
  scheduledPurgeAt: Date | null;
  retentionSource: RetentionSource | null;
  retentionArchiveSentAt: null;
  retentionPurgedAt: null;
}

/** Calendar date YYYY-MM-DD in `timeZone` (en-CA locale). */
export function formatYmdInTimeZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

function addDaysToYmd(ymd: string, days: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d + days)).toISOString().slice(0, 10);
}

/** Last millisecond of the given local calendar day in `timeZone`. */
export function endOfCalendarDayInTimeZone(ymd: string, timeZone: string): Date {
  const trimmed = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid departure date (expected YYYY-MM-DD): ${ymd}`);
  }

  const nextYmd = addDaysToYmd(trimmed, 1);
  const [y, mo, d] = trimmed.split("-").map(Number);
  let probe = Date.UTC(y, mo - 1, d, 0, 0, 0, 0) - 24 * 3600_000;

  while (formatYmdInTimeZone(new Date(probe), timeZone) < trimmed) {
    probe += 3600_000;
  }

  while (formatYmdInTimeZone(new Date(probe), timeZone) !== nextYmd) {
    probe += 3600_000;
    if (probe > Date.UTC(y, mo - 1, d + 3, 0, 0, 0, 0)) {
      throw new Error(`Could not resolve end of day for ${trimmed} in ${timeZone}`);
    }
  }

  return new Date(probe - 1);
}

/** When `departureDate` is set: purge at end of that day; archive job uses scheduledPurgeAt − lead hours. */
export function departureRetentionFields(
  departureDate: string | null | undefined,
  timeZone = getRetentionTimeZone()
): DepartureRetentionFields {
  if (!departureDate?.trim()) {
    return {
      scheduledPurgeAt: null,
      retentionSource: null,
      retentionArchiveSentAt: null,
      retentionPurgedAt: null,
    };
  }

  return {
    scheduledPurgeAt: endOfCalendarDayInTimeZone(departureDate, timeZone),
    retentionSource: "DEPARTURE",
    retentionArchiveSentAt: null,
    retentionPurgedAt: null,
  };
}

export function archiveDueAt(scheduledPurgeAt: Date, leadHours = getArchiveLeadHours()): Date {
  return new Date(scheduledPurgeAt.getTime() - leadHours * 3600_000);
}

export function selfDeleteRetentionFields(now = new Date()): {
  scheduledPurgeAt: Date;
  retentionSource: RetentionSource;
  retentionArchiveSentAt: null;
  retentionPurgedAt: null;
} {
  const delayH = getSelfDeleteDelayHours();
  return {
    scheduledPurgeAt: new Date(now.getTime() + delayH * 3600_000),
    retentionSource: "SELF_DELETE",
    retentionArchiveSentAt: null,
    retentionPurgedAt: null,
  };
}
