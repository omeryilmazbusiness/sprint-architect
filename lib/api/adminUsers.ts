import { apiRequest } from "@/lib/query-client";

export interface AdminUser {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  clinicId: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  createdAt: string;
  clinic?: { id: string; name: string; status: string } | null;
}

export interface AdminUserCreated extends AdminUser {
  generatedPassword: string;
}

export interface UnifiedEntity {
  id: string;
  entityType: "ADMIN" | "MANAGER" | "PATIENT";
  clinicId: string | null;
  clinicName: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  patientKey?: string;
  status: string;
  createdAt: string;
}

export interface UnifiedListResponse {
  rows: UnifiedEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listUnifiedEntities(params?: {
  search?: string;
  entityType?: "ADMIN" | "MANAGER" | "PATIENT";
  status?: string;
  clinicId?: string;
  page?: number;
  pageSize?: number;
}): Promise<UnifiedListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.entityType) qs.set("entityType", params.entityType);
  if (params?.status) qs.set("status", params.status);
  if (params?.clinicId) qs.set("clinicId", params.clinicId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const route = `/v1/admin/users${qs.toString() ? `?${qs}` : ""}`;
  const res = await apiRequest("GET", route);
  return res.json();
}

export interface CreateUserInput {
  email: string;
  role: "ADMIN" | "MANAGER";
  clinicId?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export interface UpdateUserInput {
  email?: string;
  role?: "ADMIN" | "MANAGER";
  clinicId?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

export async function listUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  clinicId?: string;
  page?: number;
  pageSize?: number;
}): Promise<UserListResponse> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.role) qs.set("role", params.role);
  if (params?.status) qs.set("status", params.status);
  if (params?.clinicId) qs.set("clinicId", params.clinicId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
  const route = `/v1/admin/users${qs.toString() ? `?${qs}` : ""}`;
  const res = await apiRequest("GET", route);
  return res.json();
}

export async function createUser(input: CreateUserInput): Promise<AdminUserCreated> {
  const res = await apiRequest("POST", "/v1/admin/users", input);
  return res.json();
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await apiRequest("GET", `/v1/admin/users/${id}`);
  return res.json();
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<AdminUser> {
  const res = await apiRequest("PUT", `/v1/admin/users/${id}`, input);
  return res.json();
}

export async function resetUserPasswordAuto(id: string): Promise<{ success: boolean; generatedPassword: string }> {
  const res = await apiRequest("PUT", `/v1/admin/users/${id}/reset-password`, {});
  return res.json();
}

export async function resetUserPasswordManual(id: string, password: string): Promise<{ success: boolean }> {
  const res = await apiRequest("PUT", `/v1/admin/users/${id}/password`, { password });
  return res.json();
}

export async function deactivateUser(id: string): Promise<AdminUser> {
  const res = await apiRequest("DELETE", `/v1/admin/users/${id}`);
  return res.json();
}
