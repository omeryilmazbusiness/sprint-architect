import { db } from "../db";
import { auditLogs } from "@shared/schema";

export async function auditLog(entry: {
  clinicId?: string;
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
    }).execute().catch(err => {
      console.error("Failed to insert audit log:", err);
    });
  } catch (err) {
    console.error("Failed to trigger audit log:", err);
  }
}
