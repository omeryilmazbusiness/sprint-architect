import { apiRequest } from "@/lib/query-client";

export interface SystemStatusResponse {
  api: { status: "OK" | "DEGRADED" | "DOWN"; latencyMs: number };
  db: { status: "OK" | "DEGRADED" | "DOWN"; latencyMs: number };
  uploads: { status: "ENABLED" | "DISABLED" };
}

export interface JobStatusEntry {
  name: string;
  label: string;
  schedule: string;
  description: string;
  lastRunAt: string | null;
  lastRunStatus: "SUCCESS" | "FAILED" | null;
  lastRunErrorSafe: string | null;
  nextRunAt: string;
}

export interface JobsStatusResponse {
  timezone: string;
  jobs: JobStatusEntry[];
}

export interface EmailStatusResponse {
  smtpConfigured: boolean;
  lastEmailAt: string | null;
  lastEmailStatus: "SUCCESS" | "FAILED" | null;
  failedLast24h: number;
}

export interface SecurityMetricsResponse {
  thisAdmin2faEnabled: boolean;
  failedAdminLoginsLast24h: number;
  thisAdminActiveSessions: number;
}

export async function fetchSystemStatus(): Promise<SystemStatusResponse> {
  const res = await apiRequest("GET", "/v1/admin/system/status");
  return res.json();
}

export async function fetchJobsStatus(): Promise<JobsStatusResponse> {
  const res = await apiRequest("GET", "/v1/admin/system/jobs");
  return res.json();
}

export async function fetchEmailStatus(): Promise<EmailStatusResponse> {
  const res = await apiRequest("GET", "/v1/admin/system/email");
  return res.json();
}

export async function fetchSecurityMetrics(): Promise<SecurityMetricsResponse> {
  const res = await apiRequest("GET", "/v1/admin/system/security-metrics");
  return res.json();
}
