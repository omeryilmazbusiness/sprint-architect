export interface DiagnosticsDto {
  api: { ok: boolean; latencyMs: number };
  db: { ok: boolean; latencyMs: number };
  env: { nodeEnv: string; timezone: string };
  server: { version: string };
}
