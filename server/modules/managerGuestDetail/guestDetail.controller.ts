import { Request, Response, NextFunction } from "express";
import { getGuestDetailUseCase } from "./guestDetail.usecase";
import { db } from "../../db";
import { patients, devices, refreshTokens } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { auditLog } from "../../api/auditLogger";
import { AppError } from "../../shared/errors/AppError";
import { ErrorCodes } from "../../shared/errors/ErrorCodes";
import { frameGuestDetailResponse } from "../../shared/frameUserFacingText";
import { isReviewRequest } from "../../shared/middleware/reviewMode";

export async function getGuestDetailController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const clinicId = (req as any).clinicId as string;
    const id = req.params.id as string;
    const detail = await getGuestDetailUseCase(clinicId, id);
    res.json(
      frameGuestDetailResponse(detail as unknown as Record<string, unknown>, isReviewRequest(req)),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /v1/manager/patients/:id/reset-device-binding
 * Manager-only, clinic-scoped.
 * Clears all device bindings + refresh tokens for a patient
 * so they can log in from a new device.
 */
export async function resetDeviceBindingController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const clinicId = (req as any).clinicId as string;
    const patientId = req.params.id as string;

    // Verify patient belongs to this clinic
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)),
    });

    if (!patient) {
      throw new AppError(ErrorCodes.NOT_FOUND, "Member not found", 404);
    }

    // Revoke all active device bindings (soft revoke — preserves history)
    await db
      .update(devices)
      .set({ revokedAt: new Date() })
      .where(eq(devices.patientId, patientId));

    // Revoke all active refresh tokens
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.patientId, patientId));

    auditLog({
      clinicId,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "DEVICE_BINDING_RESET",
      resourceType: "patient",
      resourceId: patientId,
      metadata: { patientKey: patient.patientKey, fullName: patient.fullName },
    });

    res.json({ ok: true, message: "Device binding reset. Patient can now log in from any device." });
  } catch (err) {
    next(err);
  }
}
