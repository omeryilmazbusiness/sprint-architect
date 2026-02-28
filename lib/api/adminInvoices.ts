import { apiRequest } from "@/lib/query-client";

export interface AdminInvoice {
  id: string;
  clinicId: string;
  period: string;
  patientCount: number;
  unitPrice: number;
  total: number;
  currency: string;
  status: "DRAFT" | "ISSUED" | "PAID";
  createdAt: string;
  clinic?: {
    id: string;
    name: string;
    currency: string;
    billingUnitPrice: number | null;
  } | null;
}

export interface AdminMetrics {
  clinics: { total: number; active: number; inactive: number };
  users: { total: number; active: number };
  invoices: { draft: number; issued: number; paid: number };
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const res = await apiRequest("GET", "/v1/admin/metrics");
  return res.json();
}

export async function generateInvoices(period: string): Promise<AdminInvoice[]> {
  const res = await apiRequest("POST", `/v1/admin/invoices/generate?period=${period}`);
  return res.json();
}

export async function listAdminInvoices(params?: {
  period?: string;
  clinicId?: string;
  status?: string;
}): Promise<AdminInvoice[]> {
  const qs = new URLSearchParams();
  if (params?.period) qs.set("period", params.period);
  if (params?.clinicId) qs.set("clinicId", params.clinicId);
  if (params?.status) qs.set("status", params.status);
  const route = `/v1/admin/invoices${qs.toString() ? `?${qs}` : ""}`;
  const res = await apiRequest("GET", route);
  return res.json();
}

export async function getAdminInvoice(id: string): Promise<AdminInvoice> {
  const res = await apiRequest("GET", `/v1/admin/invoices/${id}`);
  return res.json();
}

export async function updateInvoiceStatus(
  id: string,
  status: "DRAFT" | "ISSUED" | "PAID"
): Promise<AdminInvoice> {
  const res = await apiRequest("PUT", `/v1/admin/invoices/${id}/status`, { status });
  return res.json();
}
