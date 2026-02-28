import { apiRequest } from "@/lib/query-client";

export interface Clinic {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  billingUnitPrice: number | null;
  currency: string;
  createdAt: string;
}

export interface ClinicListResponse {
  rows: Clinic[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateClinicInput {
  name: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  billingUnitPrice?: number | null;
  currency?: string;
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

export async function updateClinic(
  id: string,
  input: Partial<CreateClinicInput>
): Promise<Clinic> {
  const res = await apiRequest("PUT", `/v1/admin/clinics/${id}`, input);
  return res.json();
}

export async function deactivateClinic(id: string): Promise<{ success: boolean }> {
  const res = await apiRequest("DELETE", `/v1/admin/clinics/${id}`);
  return res.json();
}
