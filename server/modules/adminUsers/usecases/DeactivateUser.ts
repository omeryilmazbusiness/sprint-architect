import { bulkDeactivateUsers, BulkDeactivateResult } from "./BulkDeactivateUsers";

export interface DeactivateUserInput {
  targetId: string;
  entityType: "ADMIN" | "MANAGER" | "PATIENT";
  actorId: string;
  actorRole: string;
}

export interface DeactivateUserResult {
  ok: boolean;
  blockedReason?: string;
}

export async function deactivateSingleUser(input: DeactivateUserInput): Promise<DeactivateUserResult> {
  const result: BulkDeactivateResult = await bulkDeactivateUsers(
    { targets: [{ id: input.targetId, entityType: input.entityType }] },
    input.actorId,
    input.actorRole,
  );

  if (result.blocked.length > 0) {
    return { ok: false, blockedReason: result.blocked[0].reason };
  }

  return { ok: true };
}
