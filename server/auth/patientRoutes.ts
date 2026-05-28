import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { signAccessToken, signRefreshToken } from "./jwt";
import { authRepo } from "../repositories/authRepo";
import { AppError, Errors } from "./errors";
import { authMiddleware, requireRole } from "./middleware";
import { patientRepo } from "../repositories/patientRepo";
import rateLimit from "express-rate-limit";
import { auditLog } from "../api/auditLogger";
import { db } from "../db";
import { env } from "../config";
import { clinics } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../shared/logger";
import { requestGuestSelfDeletion } from "../modules/guestRetention/usecases/RequestGuestSelfDeletion";
import { resolveGuestDeviceBinding } from "../modules/guestAccessKey/guestDeviceBinding";
import { isGuestLoginAllowed } from "../modules/guestAccessKey/guestLoginEligibility";
import { normalizeGuestAccessKey } from "../modules/guestAccessKey/normalizeGuestAccessKey";

const patientLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests, please try again later." },
});

const router = Router();

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const patientLoginSchema = z.object({
  patientKey: z.string().min(1),
  deviceId: z.string().min(1),
  platform: z.string().optional(),
});

router.post("/auth/login", patientLoginLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = patientLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    const e = Errors.VALIDATION_ERROR(parsed.error.issues[0].message);
    auditLog({
      actorId: "unknown",
      actorRole: "GUEST",
      action: "PATIENT_LOGIN_FAILED",
      metadata: { reason: "validation_error", details: parsed.error.issues[0].message },
    });
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const normalizedKey = normalizeGuestAccessKey(parsed.data.patientKey);
  if (!normalizedKey) {
    const e = Errors.VALIDATION_ERROR("Guest access key is required");
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const { deviceId, platform } = parsed.data;

  let patient: Awaited<ReturnType<typeof patientRepo.findByKey>>;
  try {
    patient = await patientRepo.findByKey(normalizedKey);
  } catch {
    const e = Errors.PATIENT_KEY_INVALID();
    auditLog({
      actorId: "unknown",
      actorRole: "GUEST",
      action: "PATIENT_LOGIN_FAILED",
      metadata: { patientKey: normalizedKey, reason: "key_invalid" },
    });
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  if (!patient || !isGuestLoginAllowed(patient.status)) {
    const e = Errors.PATIENT_KEY_INVALID();
    auditLog({
      actorId: patient?.id ?? "unknown",
      actorRole: "PATIENT",
      action: "PATIENT_LOGIN_FAILED",
      metadata: {
        patientKey: normalizedKey,
        reason: !patient ? "patient_not_found" : `status_${patient.status}`,
      },
    });
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  if (patient.clinicId) {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, patient.clinicId) });
    if (clinic?.status === "SUSPENDED") {
      const e = Errors.CLINIC_SUSPENDED();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
  }

  if (env.guestMultiDeviceDemo) {
    // DEV-ONLY: multi-device demo bypass — any device may use any key.
    // Device binding is neither checked nor written so the devices table
    // stays clean. This path is unreachable when NODE_ENV=production.
    const maskedKey = `${normalizedKey.slice(0, 4)}****`;
    logger.info("[DEMO] Guest multi-device bypass enabled", { maskedKey });
  } else {
    const existingDevice = await authRepo.getActiveDeviceForPatient(patient.id);
    const binding = resolveGuestDeviceBinding(existingDevice?.deviceId, deviceId);

    if (binding.action === "reject_other_device") {
      auditLog({
        clinicId: patient.clinicId,
        actorId: patient.id,
        actorRole: "PATIENT",
        action: "PATIENT_LOGIN_FAILED",
        resourceType: "patient",
        resourceId: patient.id,
        metadata: {
          reason: "device_already_bound",
          platform: platform ?? "unknown",
          boundDeviceId: existingDevice?.deviceId,
        },
      });
      const e = Errors.DEVICE_ALREADY_BOUND();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    if (binding.action === "bind_first_device") {
      await authRepo.bindDevice(patient.id, deviceId, platform);
      auditLog({
        clinicId: patient.clinicId,
        actorId: patient.id,
        actorRole: "PATIENT",
        action: "DEVICE_BOUND",
        resourceType: "patient",
        resourceId: patient.id,
        metadata: { platform: platform ?? "unknown" },
      });
    } else {
      await authRepo.updateDeviceLastSeen(patient.id);
    }
  }

  const accessToken = signAccessToken({
    sub: patient.id,
    role: "PATIENT",
    clinicId: patient.clinicId,
    patientId: patient.id,
    type: "patient",
  });

  const refreshToken = signRefreshToken({ sub: patient.id, type: "patient" });
  await authRepo.storeRefreshToken({
    patientId: patient.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  res.json({
    accessToken,
    refreshToken,
    patient: {
      id: patient.id,
      fullName: patient.fullName,
      clinicId: patient.clinicId,
      status: patient.status,
    },
  });
});

router.post(
  "/account/delete",
  authMiddleware,
  requireRole("PATIENT"),
  async (req: Request, res: Response): Promise<void> => {
    const patientId = req.actor?.sub;
    if (!patientId || req.actor?.type !== "patient") {
      const e = Errors.FORBIDDEN("Patient access only");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    try {
      const result = await requestGuestSelfDeletion.execute({ patientId });
      res.json(result);
    } catch (err) {
      if (err instanceof AppError) {
        res.status(err.statusCode).json({ code: err.code, message: err.message });
        return;
      }
      throw err;
    }
  }
);

router.post(
  "/:patientId/reset-device",
  authMiddleware,
  requireRole("ADMIN", "MANAGER"),
  async (req: Request, res: Response): Promise<void> => {
    const { patientId } = req.params as { patientId: string };

    // Resolve patient — managers are scoped to their clinic; admins see all.
    const clinicId = req.actor?.role === "MANAGER" ? (req.actor.clinicId ?? null) : null;
    const patient = await patientRepo.findById(patientId, clinicId);

    if (!patient) {
      const e = Errors.NOT_FOUND("Patient not found");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    if (req.actor?.role === "MANAGER" && req.actor.clinicId !== patient.clinicId) {
      const e = Errors.FORBIDDEN("Manager can only reset devices for patients in their clinic");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    // Revoke the device binding AND all active sessions so the old device
    // loses access immediately — it cannot continue with a cached token.
    await authRepo.revokeDevice(patientId);

    auditLog({
      clinicId: patient.clinicId,
      actorId: req.actor!.sub,
      actorRole: req.actor!.role,
      action: "DEVICE_RESET",
      resourceType: "patient",
      resourceId: patientId,
    });

    res.json({ message: "Device binding reset. Patient can now bind a new device." });
  },
);

export default router;
