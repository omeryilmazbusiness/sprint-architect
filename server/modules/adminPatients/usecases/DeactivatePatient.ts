import { adminPatientsReadRepo } from "../repos/AdminPatientsReadRepo.drizzle";
import { AppError } from "../../../auth/errors";
import { auditLog } from "../../../api/auditLogger";

export async function deactivatePatient(
  patientId: string,
  actorId: string,
  actorRole: string,
): Promise<{ success: boolean }> {
  const patient = await adminPatientsReadRepo.getPatientSummary(patientId);
  if (!patient) {
    throw new AppError("NOT_FOUND", "Patient not found", 404);
  }
  if (patient.status === "INACTIVE") {
    throw new AppError("CONFLICT", "Patient is already inactive", 409);
  }

  const result = await adminPatientsReadRepo.deactivatePatient(patientId);

  auditLog({
    clinicId: patient.clinicId ?? undefined,
    actorId,
    actorRole,
    action: "ADMIN_PATIENT_DEACTIVATED",
    resourceType: "patient",
    resourceId: patientId,
    metadata: { fullName: patient.fullName, patientKey: patient.patientKey },
  });

  return result;
}
