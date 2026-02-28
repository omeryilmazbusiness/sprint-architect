import { Router, type Request, type Response } from "express";
import { authStore } from "./store";
import { authMiddleware, requireRole, clinicScopeMiddleware } from "./middleware";
import { Errors } from "./errors";

const router = Router();

router.get("/me", authMiddleware, (req: Request, res: Response): void => {
  const actor = req.actor!;

  if (actor.type === "patient") {
    const patient = authStore.findPatientById(actor.sub);
    if (!patient) {
      const e = Errors.NOT_FOUND("Patient not found");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
    res.json({
      id: patient.id,
      role: "PATIENT",
      clinicId: patient.clinicId,
      fullName: patient.fullName,
      patientKey: patient.patientKey,
    });
    return;
  }

  const user = authStore.findUserById(actor.sub);
  if (!user) {
    const e = Errors.NOT_FOUND("User not found");
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    clinicId: user.clinicId,
    status: user.status,
  });
});

router.get(
  "/admin/clinics",
  authMiddleware,
  requireRole("ADMIN"),
  (_req: Request, res: Response): void => {
    const clinics = authStore.getAllClinics();
    res.json(clinics);
  },
);

router.get(
  "/manager/clinic",
  authMiddleware,
  requireRole("MANAGER"),
  clinicScopeMiddleware,
  (req: Request, res: Response): void => {
    const clinicId = req.actor!.clinicId!;
    const clinic = authStore.getClinicById(clinicId);

    if (!clinic) {
      const e = Errors.NOT_FOUND("Clinic not found");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    const patients = authStore.getAllPatientsByClinic(clinicId);

    res.json({
      ...clinic,
      patientCount: patients.length,
      patients: patients.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        patientKey: p.patientKey,
        status: p.status,
        arrivalDate: p.arrivalDate,
      })),
    });
  },
);

export default router;
