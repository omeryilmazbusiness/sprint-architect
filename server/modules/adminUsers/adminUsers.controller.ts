import type { Request, Response, NextFunction } from "express";
import { BulkDeactivateSchema } from "./schemas/adminUsers.schemas";
import { bulkDeactivateUsers } from "./usecases/BulkDeactivateUsers";
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
