import { sql } from "drizzle-orm";
import { db } from "../../db";

export interface DbPingResult {
  ok: boolean;
  latencyMs: number;
}

/** Lightweight DB connectivity probe for health and diagnostics. */
export async function pingDatabase(): Promise<DbPingResult> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
