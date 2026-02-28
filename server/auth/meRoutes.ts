import { Router, type Request, type Response } from "express";
import { authMiddleware, requireRole, clinicScopeMiddleware } from "./middleware";
import { Errors } from "./errors";
import { authRepo } from "../repositories/authRepo";
import { db } from "../db";
import { clinics, patients } from "@shared/schema";
import { eq, count } from "drizzle-orm";

const router = Router();

router.get("/me", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const actor = req.actor!;

  if (actor.type === "patient") {
    const patient = await authRepo.findPatientById(actor.sub);
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

  const user = await authRepo.findUserById(actor.sub);
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
  async (_req: Request, res: Response): Promise<void> => {
    const allClinics = await db.query.clinics.findMany();
    res.json(allClinics);
  },
);

router.get(
  "/manager/clinic",
  authMiddleware,
  requireRole("MANAGER"),
  clinicScopeMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const clinicId = req.actor!.clinicId!;

    const clinic = await db.query.clinics.findFirst({
      where: eq(clinics.id, clinicId),
    });

    if (!clinic) {
      const e = Errors.NOT_FOUND("Clinic not found");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    const [{ patientCount }] = await db
      .select({ patientCount: count() })
      .from(patients)
      .where(eq(patients.clinicId, clinicId));

    res.json({
      ...clinic,
      patientCount,
    });
  },
);

export default router;
