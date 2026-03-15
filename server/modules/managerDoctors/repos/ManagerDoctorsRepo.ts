import type { CreateDoctorInput, UpdateDoctorInput } from "../schemas/managerDoctors.schemas";

export interface DoctorDTO {
  id: string;
  clinicId: string;
  fullName: string;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  university?: string | null;
  graduationYear?: number | null;
  experienceYears?: number | null;
  bio?: string | null;
  languages?: string | null;
  certifications?: string | null;
  diplomaUrl?: string | null;
  createdAt?: Date | null;
}

export interface IManagerDoctorsRepo {
  listDoctors(clinicId: string, search?: string): Promise<{ rows: DoctorDTO[]; total: number }>;
  createDoctor(clinicId: string, input: CreateDoctorInput): Promise<DoctorDTO>;
  updateDoctor(doctorId: string, clinicId: string, input: UpdateDoctorInput): Promise<DoctorDTO | null>;
  hasAppointments(doctorId: string): Promise<boolean>;
  deleteDoctor(doctorId: string, clinicId: string): Promise<boolean>;
}
