import { z } from "zod";

export const DashboardApptSchema = z.object({
  id: z.string(),
  startAt: z.string(),
  title: z.string(),
  status: z.string(),
  patientId: z.string().nullable(),
  patientName: z.string(),
  doctorName: z.string().nullable(),
});

export const ManagerDashboardResponseSchema = z.object({
  currentMonth: z.string(),
  kpis: z.object({
    activeGuests: z.number(),
    appointmentsToday: z.number(),
    pendingDocuments: z.number(),
    missingAssignments: z.number(),
  }),
  upcomingNext7Days: z.number(),
  arrivingThisMonth: z.number(),
  todayAppointments: z.array(DashboardApptSchema),
  monthAppointments: z.array(DashboardApptSchema),
});

export type DashboardAppt = z.infer<typeof DashboardApptSchema>;
export type ManagerDashboardResponse = z.infer<typeof ManagerDashboardResponseSchema>;
