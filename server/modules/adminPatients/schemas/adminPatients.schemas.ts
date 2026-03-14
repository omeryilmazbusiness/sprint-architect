import { z } from "zod";

export const PatientIdParamSchema = z.object({
  id: z.string().min(1, "Patient ID is required"),
});
export type PatientIdParam = z.infer<typeof PatientIdParamSchema>;

export interface PatientSummaryDto {
  id: string;
  clinicId: string;
  clinicName: string;
  fullName: string;
  status: string;
  patientKey: string;
  phoneE164: string | null;
  email: string | null;
  nationalityCode: string | null;
  nationality: string | null;
  passportNo: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  requestedService: string | null;
  notes: string | null;
  createdAt: string;
}

export interface RegenerateAccessKeyDto {
  success: true;
  oneTimeAccessKey: string;
}
