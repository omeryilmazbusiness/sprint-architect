const VALID_INVOICE_STATUSES = ["PENDING", "UNPAID", "PAID"] as const;
const VALID_CLINIC_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
const PERIOD_REGEX = /^\d{4}-\d{2}$/;

export type InvoiceStatus = (typeof VALID_INVOICE_STATUSES)[number];
export type ClinicStatus = (typeof VALID_CLINIC_STATUSES)[number];

type RawParams = Record<string, string | string[] | undefined>;

function raw(params: RawParams, key: string): string | undefined {
  const v = params[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export function normalizeInvoiceFilters(params: RawParams): {
  status?: InvoiceStatus;
  clinicId?: string;
  period?: string;
} {
  const result: { status?: InvoiceStatus; clinicId?: string; period?: string } = {};

  const status = raw(params, "status");
  if (status && VALID_INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    result.status = status as InvoiceStatus;
  }

  const clinicId = raw(params, "clinicId");
  if (clinicId) result.clinicId = clinicId;

  const period = raw(params, "period");
  if (period && PERIOD_REGEX.test(period)) result.period = period;

  return result;
}

export function normalizeClinicFilters(params: RawParams): {
  status?: ClinicStatus;
} {
  const status = raw(params, "status");
  if (status && VALID_CLINIC_STATUSES.includes(status as ClinicStatus)) {
    return { status: status as ClinicStatus };
  }
  return {};
}
