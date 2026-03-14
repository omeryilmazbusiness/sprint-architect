import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../auth/errors";
import { PatientIdParamSchema } from "./schemas/adminPatients.schemas";
import { getPatientSummary } from "./usecases/GetPatientSummary";
import { deactivatePatient } from "./usecases/DeactivatePatient";
import { regenerateAccessKey } from "./usecases/RegenerateAccessKey";

export async function handleGetPatientSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = PatientIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }
    const dto = await getPatientSummary(parsed.data.id);
    res.json(dto);
  } catch (err) {
    next(err);
  }
}

export async function handleDeactivatePatient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = PatientIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }
    const result = await deactivatePatient(
      parsed.data.id,
      req.actor!.sub,
      req.actor!.role,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleRegenerateAccessKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = PatientIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", parsed.error.issues[0].message, 422);
    }
    const result = await regenerateAccessKey(
      parsed.data.id,
      req.actor!.sub,
      req.actor!.role,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
