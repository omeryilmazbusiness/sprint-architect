import { apiRequest } from "@/lib/query-client";

export interface PrimaryManager {
  id: string;
  email: string;
}

export interface Clinic {
  id: string;
  name: string;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  billingEmail: string | null;
  services: string[];
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  billingUnitPrice: number | null;
  currency: string;
  billingAnchorDay: number;
  notes: string | null;
  createdAt: string;
  primaryManager: PrimaryManager | null;
}

export interface ClinicListResponse {
  rows: Clinic[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateClinicInput {
  name: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  websiteUrl?: string;
  billingEmail?: string;
  services?: string[];
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  billingUnitPrice?: number | null;
  currency?: string;
  notes?: string;
}

export interface InvoiceSummary {
  id: string;
  period: string;
  status: "DRAFT" | "ISSUED" | "PAID";
  total: number;
  currency: string;
  patientCount: number;
  unitPrice: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ClinicManager {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface ClinicDetail extends Clinic {
  nextInvoiceDate: string;
  currentPeriodInvoice: InvoiceSummary | null;
  managers: ClinicManager[];
  invoiceTimeline: InvoiceSummary[];
}

export async function listClinics(params?: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ClinicListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const route = `/v1/admin/clinics${qs.toString() ? `?${qs}` : ""}`;
  const res = await apiRequest("GET", route);
  return res.json();
}

export async function createClinic(input: CreateClinicInput): Promise<Clinic> {
  const res = await apiRequest("POST", "/v1/admin/clinics", input);
  return res.json();
}

export async function getClinic(id: string): Promise<Clinic> {
  const res = await apiRequest("GET", `/v1/admin/clinics/${id}`);
  return res.json();
}

export async function getClinicDetail(id: string): Promise<ClinicDetail> {
  const res = await apiRequest("GET", `/v1/admin/clinics/${id}/detail`);
  return res.json();
}

export async function updateClinic(
  id: string,
  input: Partial<CreateClinicInput> & { billingAnchorDay?: number }
): Promise<Clinic> {
  const res = await apiRequest("PUT", `/v1/admin/clinics/${id}`, input);
  return res.json();
}

export async function deactivateClinic(id: string): Promise<{ success: boolean }> {
  const res = await apiRequest("DELETE", `/v1/admin/clinics/${id}`);
  return res.json();
}
