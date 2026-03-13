export interface PeriodBoundaries {
  periodStart: string;
  periodEnd: string;
  startDate: Date;
  endDate: Date;
}

export function getPeriodBoundaries(period: string): PeriodBoundaries {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Invalid period format: ${period}. Expected YYYY-MM`);
  }

  const periodStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  return { periodStart, periodEnd, startDate, endDate };
}

export const BILLABLE_STATUSES = ["APPROVED", "ENDED"] as const;

export type BillableStatus = (typeof BILLABLE_STATUSES)[number];

export function isBillableStatus(status: string): boolean {
  return (BILLABLE_STATUSES as readonly string[]).includes(status);
}

export function isPatientInPeriod(
  patient: { arrivalDate?: string | null; createdAt: Date; status: string },
  boundaries: PeriodBoundaries
): { billable: boolean; usedFallback: boolean } {
  if (!isBillableStatus(patient.status)) {
    return { billable: false, usedFallback: false };
  }

  if (patient.arrivalDate) {
    const inPeriod =
      patient.arrivalDate >= boundaries.periodStart &&
      patient.arrivalDate < boundaries.periodEnd;
    return { billable: inPeriod, usedFallback: false };
  }

  const inPeriod =
    patient.createdAt >= boundaries.startDate &&
    patient.createdAt < boundaries.endDate;
  return { billable: inPeriod, usedFallback: true };
}
