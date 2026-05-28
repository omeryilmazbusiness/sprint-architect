/** Guest data retention configuration (env-backed). */

const DEFAULT_TZ = "Europe/Istanbul";
const DEFAULT_ARCHIVE_LEAD_HOURS = 1;
const DEFAULT_SELF_DELETE_DELAY_HOURS = 1;

export function getRetentionTimeZone(): string {
  return process.env.GUEST_RETENTION_TZ?.trim() || DEFAULT_TZ;
}

export function getArchiveLeadHours(): number {
  const n = Number(process.env.GUEST_ARCHIVE_LEAD_HOURS ?? DEFAULT_ARCHIVE_LEAD_HOURS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_ARCHIVE_LEAD_HOURS;
}

export function getSelfDeleteDelayHours(): number {
  const n = Number(process.env.GUEST_SELF_DELETE_DELAY_HOURS ?? DEFAULT_SELF_DELETE_DELAY_HOURS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_SELF_DELETE_DELAY_HOURS;
}
