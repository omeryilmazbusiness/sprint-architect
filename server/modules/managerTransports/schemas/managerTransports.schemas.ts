import { z } from "zod";

export const VEHICLE_BRAND_ENUM = [
  "MERCEDES",
  "LEXUS",
  "VOLKSWAGEN",
  "BMW",
  "AUDI",
  "TOYOTA",
  "FORD",
] as const;

export const createTransportSchema = z.object({
  driverFullName: z.string().min(2, "Driver name must be at least 2 characters"),
  driverPhoneE164: z.string().min(7, "Phone required"),
  vehicleBrand: z.enum(VEHICLE_BRAND_ENUM, { errorMap: () => ({ message: "Select a vehicle brand" }) }),
  vehicleModel: z.string().min(1, "Vehicle model required"),
  licensePlate: z.string().min(3, "License plate required"),
  vehicleColor: z.string().optional(),
  vehicleYear: z.number().int().min(1900).max(2100).optional(),
});

export const updateTransportSchema = createTransportSchema.partial();

export type CreateTransportInput = z.infer<typeof createTransportSchema>;
export type UpdateTransportInput = z.infer<typeof updateTransportSchema>;

export interface TransportDTO {
  id: string;
  driverFullName: string;
  driverPhoneE164: string;
  vehicleBrand: string;
  vehicleModel: string;
  licensePlate: string;
  vehicleColor?: string | null;
  vehicleYear?: number | null;
  createdAt: string;
}
