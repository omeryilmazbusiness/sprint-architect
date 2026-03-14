import { adminUsersRepo } from "../repos/AdminUsersRepo.drizzle";
import { auditLog } from "../../../api/auditLogger";
import type { BulkPurgeInput } from "../schemas/adminUsers.schemas";

export interface PurgeBlockedTarget {
  id: string;
  entityType: string;
  reason: string;
}

export interface BulkPurgeResult {
  purged: number;
  blocked: PurgeBlockedTarget[];
}

export async function bulkPurgeUsers(
  input: BulkPurgeInput,
  actorId: string,
  actorRole: string,
): Promise<BulkPurgeResult> {
  const expectedConfirm = `PURGE ${input.targets.length}`;
  if (input.confirmText.trim() !== expectedConfirm) {
    throw new Error(
      `Invalid confirmText. Expected exactly "${expectedConfirm}".`,
    );
  }

  const blocked: PurgeBlockedTarget[] = [];
  const usersToPurge: string[] = [];
  const patientsToPurge: string[] = [];

  const primaryManagerIds = await adminUsersRepo.getPrimaryManagerUserIds();
  const paidInvoiceUserIds = await adminUsersRepo.getUserIdsWithPaidInvoices();

  for (const target of input.targets) {
    const entityType = target.entityType;

    if (target.id === actorId) {
      blocked.push({ id: target.id, entityType, reason: "SELF_PURGE_BLOCKED" });
      continue;
    }

    if (entityType === "ADMIN" || entityType === "MANAGER") {
      if (primaryManagerIds.has(target.id)) {
        blocked.push({
          id: target.id,
          entityType,
          reason: "PRIMARY_MANAGER_PURGE_BLOCKED",
        });
        continue;
      }
      if (paidInvoiceUserIds.has(target.id)) {
        blocked.push({
          id: target.id,
          entityType,
          reason: "PAID_INVOICES_EXIST",
        });
        continue;
      }
      usersToPurge.push(target.id);
    } else {
      patientsToPurge.push(target.id);
    }
  }

  const purged = await adminUsersRepo.purgeInTransaction(
    usersToPurge,
    patientsToPurge,
  );

  auditLog({
    actorId,
    actorRole,
    action: "ADMIN_BULK_PURGE",
    metadata: {
      purged,
      blocked: blocked.length,
      blockedIds: blocked.map((b) => b.id),
      userIds: usersToPurge,
      patientIds: patientsToPurge,
    },
  });

  return { purged, blocked };
}
