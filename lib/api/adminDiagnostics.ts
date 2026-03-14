import { apiRequest } from "@/lib/query-client";

export interface DiagnosticsResult {
  api: { ok: boolean; latencyMs: number };
  db: { ok: boolean; latencyMs: number };
  env: { nodeEnv: string; timezone: string };
  server: { version: string };
}

export async function fetchDiagnostics(): Promise<DiagnosticsResult> {
  const res = await apiRequest("GET", "/v1/admin/diagnostics");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? "Diagnostics unavailable");
  }
  return res.json();
}
