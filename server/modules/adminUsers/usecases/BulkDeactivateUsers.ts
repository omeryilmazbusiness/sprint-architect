import { adminUsersRepo } from "../repos/AdminUsersRepo.drizzle";
import { auditLog } from "../../../api/auditLogger";
import type { BulkDeactivateInput } from "../schemas/adminUsers.schemas";

export interface BlockedTarget {
  id: string;
  reason: string;
}

export interface BulkDeactivateResult {
  deactivated: number;
  blocked: BlockedTarget[];
}

export async function bulkDeactivateUsers(
  input: BulkDeactivateInput,
  actorId: string,
  actorRole: string,
): Promise<BulkDeactivateResult> {
  const blocked: BlockedTarget[] = [];
  const userIdsToDeactivate: string[] = [];
  const patientIdsToDeactivate: string[] = [];

  const userTargets = input.targets.filter(
    (t) => t.entityType === "ADMIN" || t.entityType === "MANAGER",
  );
  const patientTargets = input.targets.filter(
    (t) => t.entityType === "PATIENT",
  );

  const primaryManagerIds = await adminUsersRepo.getPrimaryManagerUserIds();

  for (const target of userTargets) {
    if (target.id === actorId) {
      blocked.push({ id: target.id, reason: "SELF_DEACTIVATION_BLOCKED" });
      continue;
    }
    if (primaryManagerIds.has(target.id)) {
      blocked.push({
        id: target.id,
        reason: "PRIMARY_MANAGER_DEACTIVATION_BLOCKED",
      });
      continue;
    }
    userIdsToDeactivate.push(target.id);
  }

  for (const target of patientTargets) {
    patientIdsToDeactivate.push(target.id);
  }

  const [deactivatedUsers, deactivatedPatients] = await Promise.all([
    adminUsersRepo.deactivateUsers(userIdsToDeactivate),
    adminUsersRepo.deactivatePatients(patientIdsToDeactivate),
  ]);

  const deactivated = deactivatedUsers + deactivatedPatients;

  auditLog({
    actorId,
    actorRole,
    action: "ADMIN_BULK_DEACTIVATE",
    metadata: {
      deactivated,
      blocked: blocked.length,
      blockedIds: blocked.map((b) => b.id),
      userIds: userIdsToDeactivate,
      patientIds: patientIdsToDeactivate,
    },
  });

  return { deactivated, blocked };
}
