import { apiRequest } from "@/lib/query-client";

export interface PatientSummary {
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

export interface RegenerateKeyResult {
  success: boolean;
  oneTimeAccessKey: string;
}

export async function getPatientSummary(id: string): Promise<PatientSummary> {
  const res = await apiRequest("GET", `/v1/admin/patients/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? "Failed to load patient");
  }
  return res.json();
}

export async function deactivatePatient(id: string): Promise<{ success: boolean }> {
  const res = await apiRequest("POST", `/v1/admin/patients/${id}/deactivate`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? "Failed to deactivate patient");
  }
  return res.json();
}

export async function regeneratePatientAccessKey(id: string): Promise<RegenerateKeyResult> {
  const res = await apiRequest("POST", `/v1/admin/patients/${id}/regenerate-access-key`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message ?? "Failed to regenerate access key");
  }
  return res.json();
}
