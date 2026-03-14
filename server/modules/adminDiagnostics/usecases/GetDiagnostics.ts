import { pingDb } from "../repos/AdminDiagnosticsRepo.drizzle";
import type { DiagnosticsDto } from "../schemas/adminDiagnostics.schemas";

const APP_VERSION = "1.0.0";
const TIMEZONE = process.env.TZ ?? "Europe/Istanbul";

export async function getDiagnostics(): Promise<DiagnosticsDto> {
  const apiStart = Date.now();
  const dbResult = await pingDb();
  const apiLatency = Date.now() - apiStart;

  return {
    api: { ok: true, latencyMs: apiLatency },
    db: dbResult,
    env: {
      nodeEnv: process.env.NODE_ENV ?? "development",
      timezone: TIMEZONE,
    },
    server: { version: APP_VERSION },
  };
}
