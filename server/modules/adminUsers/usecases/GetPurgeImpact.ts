import { adminUsersRepo } from "../repos/AdminUsersRepo.drizzle";
import { AppError } from "../../../shared/errors/AppError";
import { ErrorCodes } from "../../../shared/errors/ErrorCodes";

export async function getPurgeImpact(
  targetId: string,
  entityType: "ADMIN" | "MANAGER" | "PATIENT",
  actorId: string,
) {
  if (targetId === actorId) {
    return {
      canPurge: false,
      blockedReasons: ["BLOCKED_SELF"],
      target: null,
      dependencies: {
        refreshTokens: 0,
        devices: 0,
        credentialRequests: 0,
        notifications: 0,
        invoicesPaidBy: 0,
        auditLogsActor: 0,
        isPrimaryManager: false,
      },
    };
  }

  const impact = await adminUsersRepo.getSingleUserPurgeImpact(targetId, entityType);

  if (!impact.target) {
    throw new AppError(ErrorCodes.NOT_FOUND, "User not found", 404);
  }

  return impact;
}
