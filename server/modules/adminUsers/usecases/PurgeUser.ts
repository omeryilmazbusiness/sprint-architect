import { adminUsersRepo, type PurgeMode } from "../repos/AdminUsersRepo.drizzle";
import { auditLog } from "../../../api/auditLogger";
import { AppError } from "../../../shared/errors/AppError";
import { ErrorCodes } from "../../../shared/errors/ErrorCodes";

function buildExpectedConfirmText(
  entityType: "ADMIN" | "MANAGER" | "PATIENT",
  email: string | null,
  patientKey: string | null,
): string {
  if (entityType === "PATIENT") {
    return `PURGE ${patientKey ?? ""}`;
  }
  return `PURGE ${email ?? ""}`;
}

export async function purgeUser(input: {
  targetId: string;
  entityType: "ADMIN" | "MANAGER" | "PATIENT";
  confirmText: string;
  mode: PurgeMode;
  actorId: string;
  actorRole: string;
}): Promise<{ ok: true }> {
  const { targetId, entityType, confirmText, mode, actorId, actorRole } = input;

  if (targetId === actorId) {
    throw new AppError(ErrorCodes.PURGE_BLOCKED_SELF, "You cannot purge your own account", 403);
  }

  const impact = await adminUsersRepo.getSingleUserPurgeImpact(targetId, entityType);

  if (!impact.target) {
    throw new AppError(ErrorCodes.NOT_FOUND, "User not found", 404);
  }

  const expected = buildExpectedConfirmText(entityType, impact.target.email, impact.target.patientKey);
  if (confirmText.trim() !== expected) {
    throw new AppError(
      ErrorCodes.PURGE_CONFIRM_MISMATCH,
      `Confirmation text must be exactly: "${expected}"`,
      400,
    );
  }

  if (impact.dependencies.isPrimaryManager) {
    throw new AppError(
      ErrorCodes.PURGE_PRIMARY_MANAGER_BLOCKED,
      "Reassign this clinic's primary manager before purging",
      409,
    );
  }

  if (mode === "STRICT") {
    const strictBlocks = impact.blockedReasons.filter(
      (r) => r !== "PRIMARY_MANAGER_DELETE_BLOCKED",
    );
    if (strictBlocks.length > 0) {
      throw new AppError(
        ErrorCodes.PURGE_BLOCKED_REFERENCES,
        "User has critical references that must be anonymized first. Use mode=ANONYMIZE or resolve references.",
        409,
        {
          details: {
            blockedReasons: impact.blockedReasons,
            invoicesPaidBy: impact.dependencies.invoicesPaidBy,
            auditLogsActor: impact.dependencies.auditLogsActor,
          },
        },
      );
    }
  }

  await adminUsersRepo.purgeSingleUserInTransaction(targetId, entityType, mode);

  auditLog({
    actorId,
    actorRole,
    action: "ADMIN_USER_PURGED",
    resourceType: entityType,
    resourceId: targetId,
    metadata: {
      targetId,
      entityType,
      mode,
      blockedRefsCounts: {
        invoicesPaidBy: impact.dependencies.invoicesPaidBy,
        auditLogsActor: impact.dependencies.auditLogsActor,
      },
    },
  });

  return { ok: true };
}
