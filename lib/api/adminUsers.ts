import { apiRequest } from "@/lib/query-client";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  phoneE164: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER";
  clinicId: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  statusReason: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
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

/** @deprecated Use UnifiedListResponse — kept for legacy callers */
export type UserListResponse = UnifiedListResponse;

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
  fullName?: string;
  phoneE164?: string;
  role: "ADMIN" | "MANAGER";
  clinicId?: string | null;
  setAsPrimaryManager?: boolean;
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

export async function deactivateSingleUser(
  id: string,
  entityType: "ADMIN" | "MANAGER" | "PATIENT",
): Promise<{ ok: boolean }> {
  const res = await apiRequest("POST", `/v1/admin/users/${id}/deactivate`, { entityType });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const code: string = body?.code ?? "DEACTIVATION_BLOCKED";
    const messages: Record<string, string> = {
      SELF_DEACTIVATION_BLOCKED: "You cannot deactivate your own admin account.",
      PRIMARY_MANAGER_BLOCKED: "Reassign this clinic's primary manager before deactivating.",
    };
    throw new Error(messages[code] ?? body?.message ?? "Deactivation blocked");
  }
  return res.json();
}

export interface BulkDeactivateTarget {
  id: string;
  entityType: "ADMIN" | "MANAGER" | "PATIENT";
}

export interface BulkDeactivateResult {
  deactivated: number;
  blocked: { id: string; reason: string }[];
}

export async function bulkDeactivate(
  targets: BulkDeactivateTarget[],
): Promise<BulkDeactivateResult> {
  const res = await apiRequest("POST", "/v1/admin/users/bulk-deactivate", {
    targets,
  });
  return res.json();
}

export interface BulkPurgeTarget {
  id: string;
  entityType: "ADMIN" | "MANAGER" | "PATIENT";
}

export interface BulkPurgeResult {
  purged: number;
  blocked: { id: string; entityType: string; reason: string }[];
}

export async function bulkPurge(
  targets: BulkPurgeTarget[],
  confirmText: string,
): Promise<BulkPurgeResult> {
  const res = await apiRequest("POST", "/v1/admin/users/bulk-purge", {
    targets,
    confirmText,
  });
  return res.json();
}

export interface PurgeImpactDependencies {
  refreshTokens: number;
  devices: number;
  credentialRequests: number;
  notifications: number;
  invoicesPaidBy: number;
  auditLogsActor: number;
  isPrimaryManager: boolean;
}

export interface PurgeImpactTarget {
  id: string;
  entityType: "ADMIN" | "MANAGER" | "PATIENT";
  email: string | null;
  displayName: string | null;
  patientKey: string | null;
  role: string | null;
  clinicId: string | null;
}

export interface PurgeImpactResponse {
  canPurge: boolean;
  blockedReasons: string[];
  target: PurgeImpactTarget | null;
  dependencies: PurgeImpactDependencies;
}

export async function getPurgeImpact(
  id: string,
  entityType: "ADMIN" | "MANAGER" | "PATIENT",
): Promise<PurgeImpactResponse> {
  const res = await apiRequest("GET", `/v1/admin/users/${id}/purge-impact?entityType=${entityType}`);
  return res.json();
}

export async function purgeUser(
  id: string,
  input: {
    entityType: "ADMIN" | "MANAGER" | "PATIENT";
    confirmText: string;
    mode?: "STRICT" | "ANONYMIZE";
  },
): Promise<{ ok: true }> {
  const res = await apiRequest("DELETE", `/v1/admin/users/${id}/purge`, input);
  return res.json();
}
