import { apiRequest } from "@/lib/query-client";

export interface DiagnosticsResult {
  api: { ok: boolean; latencyMs: number };
  db: { ok: boolean; latencyMs: number };
  env: { nodeEnv: string; timezone: string };
  server: { version: string };
}

interface ErrorBody {
  message?: string;
}

export async function fetchDiagnostics(): Promise<DiagnosticsResult> {
  const res = await apiRequest("GET", "/v1/admin/diagnostics");
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as ErrorBody;
    throw new Error(err.message ?? "Diagnostics unavailable");
  }
  return res.json() as Promise<DiagnosticsResult>;
}
