import { z } from "zod";

export const doctorIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createDoctorSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  specialty: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  photoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  university: z.string().max(300).optional(),
  graduationYear: z.number().int().min(1950).max(2030).optional().nullable(),
  experienceYears: z.number().int().min(0).max(70).optional().nullable(),
  bio: z.string().max(2000).optional(),
  languages: z.string().max(500).optional(),
  certifications: z.string().max(1000).optional(),
  diplomaUrl: z.string().max(500).optional().or(z.literal("")),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
