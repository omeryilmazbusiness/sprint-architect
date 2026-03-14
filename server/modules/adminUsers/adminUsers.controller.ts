import type { Request, Response, NextFunction } from "express";
import {
  BulkDeactivateSchema,
  BulkPurgeSchema,
  DeactivateSingleUserSchema,
} from "./schemas/adminUsers.schemas";
import { bulkDeactivateUsers } from "./usecases/BulkDeactivateUsers";
import { bulkPurgeUsers } from "./usecases/BulkPurgeUsers";
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
    const result = await bulkDeactivateUsers(
      parsed.data,
      req.actor!.sub,
      req.actor!.role,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleBulkPurge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = BulkPurgeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.message, 400);
    }
    const result = await bulkPurgeUsers(
      parsed.data,
      req.actor!.sub,
      req.actor!.role,
    );
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid confirmText")) {
      next(new AppError("INVALID_CONFIRM_TEXT", err.message, 422));
    } else {
      next(err);
    }
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

    const result = await deactivateSingleUser({
      targetId: String(req.params.id),
      entityType: parsed.data.entityType,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
    });

    if (!result.ok) {
      const statusMap: Record<string, number> = {
        SELF_DEACTIVATION_BLOCKED: 403,
        PRIMARY_MANAGER_BLOCKED: 409,
      };
      const status = statusMap[result.blockedReason ?? ""] ?? 422;
      throw new AppError(
        result.blockedReason ?? "DEACTIVATION_BLOCKED",
        result.blockedReason ?? "Deactivation blocked",
        status,
      );
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
