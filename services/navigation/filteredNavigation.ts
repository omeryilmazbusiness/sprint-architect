import { router } from "expo-router";

type InvoiceStatus = "PENDING" | "UNPAID" | "PAID";
type ClinicStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

interface InvoiceNavParams {
  status?: InvoiceStatus;
  clinicId?: string;
  period?: string;
}

interface ClinicNavParams {
  status?: ClinicStatus;
}

function buildParams(
  raw: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (val !== undefined && val !== "") {
      out[key] = val;
    }
  }
  return out;
}

export function goToInvoices(params: InvoiceNavParams = {}): void {
  const p = buildParams({
    status: params.status,
    clinicId: params.clinicId,
    period: params.period,
  });
  if (Object.keys(p).length === 0) {
    router.push("/(admin)/invoices");
  } else {
    router.push({ pathname: "/(admin)/invoices", params: p });
  }
}

export function goToClinics(params: ClinicNavParams = {}): void {
  const p = buildParams({ status: params.status });
  if (Object.keys(p).length === 0) {
    router.push("/(admin)/clinics");
  } else {
    router.push({ pathname: "/(admin)/clinics", params: p });
  }
}
