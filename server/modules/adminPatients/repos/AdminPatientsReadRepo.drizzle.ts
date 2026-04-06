import { db } from "../../../db";
import { patients, clinics } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { PatientSummaryDto } from "../schemas/adminPatients.schemas";
import { generatePatientKey, MAX_KEY_ATTEMPTS } from "../../../utils/patientKey";
import { patientRepo } from "../../../repositories/patientRepo";
import { authRepo } from "../../../repositories/authRepo";

export const adminPatientsReadRepo = {
  async getPatientSummary(patientId: string): Promise<PatientSummaryDto | null> {
    const rows = await db
      .select({
        id: patients.id,
        clinicId: patients.clinicId,
        clinicName: clinics.name,
        fullName: patients.fullName,
        status: patients.status,
        patientKey: patients.patientKey,
        phoneE164: patients.phoneE164,
        email: patients.email,
        nationalityCode: patients.nationalityCode,
        nationality: patients.nationality,
        passportNo: patients.passportNo,
        arrivalDate: patients.arrivalDate,
        departureDate: patients.departureDate,
        requestedService: patients.requestedService,
        notes: patients.notes,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .leftJoin(clinics, eq(patients.clinicId, clinics.id))
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!rows.length) return null;
    const row = rows[0];

    return {
      id: row.id,
      clinicId: row.clinicId ?? "",
      clinicName: row.clinicName ?? "—",
      fullName: row.fullName,
      status: row.status,
      patientKey: row.patientKey,
      phoneE164: row.phoneE164 ?? null,
      email: row.email ?? null,
      nationalityCode: row.nationalityCode ?? null,
      nationality: row.nationality ?? null,
      passportNo: row.passportNo ?? null,
      arrivalDate: row.arrivalDate ?? null,
      departureDate: row.departureDate ?? null,
      requestedService: row.requestedService ?? null,
      notes: row.notes ?? null,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    };
  },

  async deactivatePatient(
    patientId: string,
  ): Promise<{ success: boolean }> {
    await db
      .update(patients)
      .set({ status: "INACTIVE" })
      .where(eq(patients.id, patientId));
    return { success: true };
  },

  async regenerateAccessKey(
    patientId: string,
  ): Promise<string> {
    let newKey = generatePatientKey();
    let attempts = 0;
    while (attempts < MAX_KEY_ATTEMPTS) {
      const existing = await patientRepo.findByKey(newKey);
      if (!existing) break;
      if (++attempts >= MAX_KEY_ATTEMPTS) throw new Error("Failed to generate unique patient key after max attempts");
      newKey = generatePatientKey();
    }

    await db
      .update(patients)
      .set({ patientKey: newKey })
      .where(eq(patients.id, patientId));

    await authRepo.revokeDevice(patientId);
    await authRepo.revokeAllRefreshTokensForPatient(patientId);

    return newKey;
  },
};
