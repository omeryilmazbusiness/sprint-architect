import { db } from "../../../db";
import { sql } from "drizzle-orm";

export async function pingDb(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
