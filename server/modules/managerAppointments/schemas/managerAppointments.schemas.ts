import { z } from "zod";

export const TodayAppointmentItemSchema = z.object({
  id: z.string(),
  startAt: z.string(),
  title: z.string(),
  status: z.string(),
  patientId: z.string().nullable(),
  patientName: z.string(),
  doctorName: z.string().nullable(),
});

export const TodayAppointmentsResponseSchema = z.object({
  date: z.string(),
  items: z.array(TodayAppointmentItemSchema),
});

export type TodayAppointmentItem = z.infer<typeof TodayAppointmentItemSchema>;
export type TodayAppointmentsResponse = z.infer<typeof TodayAppointmentsResponseSchema>;
