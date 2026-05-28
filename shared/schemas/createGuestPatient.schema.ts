import { z } from "zod";
import { requestedServicesSchema } from "./requestedServices.schema";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

/** Manager POST /v1/manager/patients — create guest intake */
export const createGuestPatientSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required").max(200),
    dateOfBirth: z.string().regex(isoDateRegex).optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    nationality: z.string().trim().min(1, "Nationality is required"),
    nationalityCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Nationality code must be 2 letters"),
    passportNo: z.string().trim().optional(),
    phoneE164: z.string().trim().min(5, "Phone is required"),
    phone: z.string().trim().optional(),
    email: z.union([z.string().trim().email("Invalid email address"), z.literal("")]).optional(),
    emergencyContactName: z.string().trim().optional(),
    emergencyContactPhoneE164: z.string().trim().optional(),
    companionRelation: z.string().trim().optional(),
    arrivalDate: z.string().regex(isoDateRegex, "Arrival date must be YYYY-MM-DD"),
    departureDate: z.string().regex(isoDateRegex, "Departure date must be YYYY-MM-DD"),
    arrivalAirport: z.string().trim().optional(),
    flightNumber: z.string().trim().optional(),
    requestedServices: requestedServicesSchema,
    notes: z.string().trim().optional(),
    preferredLanguage: z.string().trim().optional(),
  })
  .refine((d) => d.departureDate >= d.arrivalDate, {
    message: "Departure date must be on or after arrival date",
    path: ["departureDate"],
  });

export type CreateGuestPatientInput = z.infer<typeof createGuestPatientSchema>;
