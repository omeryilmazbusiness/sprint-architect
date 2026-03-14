import { adminPatientsReadRepo } from "../repos/AdminPatientsReadRepo.drizzle";
import { AppError } from "../../../auth/errors";
import { auditLog } from "../../../api/auditLogger";
import type { RegenerateAccessKeyDto } from "../schemas/adminPatients.schemas";

export async function regenerateAccessKey(
  patientId: string,
  actorId: string,
  actorRole: string,
): Promise<RegenerateAccessKeyDto> {
  const patient = await adminPatientsReadRepo.getPatientSummary(patientId);
  if (!patient) {
    throw new AppError("NOT_FOUND", "Patient not found", 404);
  }

  const newKey = await adminPatientsReadRepo.regenerateAccessKey(patientId);

  auditLog({
    clinicId: patient.clinicId ?? undefined,
    actorId,
    actorRole,
    action: "GUEST_ACCESS_KEY_REGENERATED",
    resourceType: "patient",
    resourceId: patientId,
    metadata: { initiatedBy: "admin_direct", fullName: patient.fullName },
  });

  return { success: true, oneTimeAccessKey: newKey };
}
