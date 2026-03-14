import { db } from "../../../db";
import { sql } from "drizzle-orm";

export interface SystemStatusResult {
  api: { status: "OK" | "DEGRADED" | "DOWN"; latencyMs: number };
  db: { status: "OK" | "DEGRADED" | "DOWN"; latencyMs: number };
  uploads: { status: "ENABLED" | "DISABLED" };
}

export async function getSystemStatus(): Promise<SystemStatusResult> {
  const dbStart = Date.now();
  let dbStatus: "OK" | "DEGRADED" | "DOWN" = "OK";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "DOWN";
  }
  const dbLatency = Date.now() - dbStart;
  if (dbLatency > 500 && dbStatus === "OK") dbStatus = "DEGRADED";

  const uploadsEnabled =
    !!(process.env.UPLOAD_BUCKET || process.env.CLOUDFLARE_R2_BUCKET || process.env.S3_BUCKET);

  return {
    api: { status: "OK", latencyMs: 0 },
    db: { status: dbStatus, latencyMs: dbLatency },
    uploads: { status: uploadsEnabled ? "ENABLED" : "DISABLED" },
  };
}
