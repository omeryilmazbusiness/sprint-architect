import type { Request, Response, NextFunction } from "express";
import { BulkDeactivateSchema, DeactivateSingleUserSchema } from "./schemas/adminUsers.schemas";
import { bulkDeactivateUsers } from "./usecases/BulkDeactivateUsers";
import { deactivateSingleUser } from "./usecases/DeactivateUser";
import { AppError } from "../../auth/errors";

export async function handleBulkDeactivate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = BulkDeactivateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    }

    const actorId = req.actor!.sub;
    const actorRole = req.actor!.role;

    const result = await bulkDeactivateUsers(parsed.data, actorId, actorRole);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleDeactivateSingle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = DeactivateSingleUserSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    }

    const actorId = req.actor!.sub;
    const actorRole = req.actor!.role;

    const result = await deactivateSingleUser({
      targetId: req.params.id,
      entityType: parsed.data.entityType,
      actorId,
      actorRole,
    });

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        SELF_DEACTIVATION_BLOCKED: 403,
        PRIMARY_MANAGER_BLOCKED: 409,
      };
      const status = statusMap[result.blockedReason ?? ""] ?? 422;
      throw new AppError(result.blockedReason ?? "DEACTIVATION_BLOCKED", result.blockedReason ?? "Deactivation blocked", status);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
