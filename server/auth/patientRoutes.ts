import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { signAccessToken, signRefreshToken } from "./jwt";
import { authStore } from "./store";
import { Errors } from "./errors";
import { authMiddleware, requireRole } from "./middleware";

const router = Router();

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const patientLoginSchema = z.object({
  patientKey: z.string().min(1),
  deviceId: z.string().min(1),
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = patientLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    const e = Errors.VALIDATION_ERROR(parsed.error.issues[0].message);
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const { patientKey, deviceId } = parsed.data;
  const patient = authStore.findPatientByKey(patientKey);

  if (!patient || patient.status !== "ACTIVE") {
    const e = Errors.PATIENT_KEY_INVALID();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const existingDevice = authStore.getActiveDeviceForPatient(patient.id);

  if (existingDevice) {
    if (existingDevice.deviceId !== deviceId) {
      const e = Errors.DEVICE_ALREADY_BOUND();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
  } else {
    authStore.bindDevice(patient.id, deviceId);
  }

  const accessToken = signAccessToken({
    sub: patient.id,
    role: "PATIENT",
    clinicId: patient.clinicId,
    patientId: patient.id,
    type: "patient",
  });

  const refreshToken = signRefreshToken({ sub: patient.id, type: "patient" });
  authStore.storeRefreshToken({
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
  "/:patientId/reset-device",
  authMiddleware,
  requireRole("ADMIN", "MANAGER"),
  (req: Request, res: Response): void => {
    const { patientId } = req.params;
    const patient = authStore.findPatientById(patientId);

    if (!patient) {
      const e = Errors.NOT_FOUND("Patient not found");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    if (
      req.actor?.role === "MANAGER" &&
      req.actor.clinicId !== patient.clinicId
    ) {
      const e = Errors.FORBIDDEN("Manager can only reset devices for patients in their clinic");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    authStore.revokeDevice(patientId);

    res.json({ message: "Device binding reset. Patient can now bind a new device." });
  },
);

export default router;
