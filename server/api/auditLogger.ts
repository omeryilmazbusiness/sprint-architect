import { db } from "../db";
import { auditLogs } from "@shared/schema";
import { logger } from "../shared/logger";

export async function auditLog(entry: {
  clinicId?: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: object;
}) {
  try {
    // Fire-and-forget, but catch errors to avoid crashing the server
    db.insert(auditLogs).values({
      clinicId: entry.clinicId ?? null,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    }).execute().catch((err: unknown) => {
      logger.error("[auditLog] Failed to insert audit log", {
        action: entry.action,
        actorId: entry.actorId,
        error: err instanceof Error ? err.message.slice(0, 200) : "unknown",
      });
    });
  } catch (err) {
    logger.error("[auditLog] Failed to trigger audit log", {
      action: entry.action,
      actorId: entry.actorId,
      error: err instanceof Error ? (err as Error).message.slice(0, 200) : "unknown",
    });
  }
}
