import { adminPatientsReadRepo } from "../repos/AdminPatientsReadRepo.drizzle";
import { AppError } from "../../../auth/errors";
import type { PatientSummaryDto } from "../schemas/adminPatients.schemas";

export async function getPatientSummary(
  patientId: string,
): Promise<PatientSummaryDto> {
  const patient = await adminPatientsReadRepo.getPatientSummary(patientId);
  if (!patient) {
    throw new AppError("NOT_FOUND", "Patient not found", 404);
  }
  return patient;
}
