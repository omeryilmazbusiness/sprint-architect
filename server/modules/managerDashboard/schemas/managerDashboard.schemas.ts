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

export const PendingGuestDocSummarySchema = z.object({
  patientId: z.string(),
  patientName: z.string(),
  pending: z.number(),
  uploaded: z.number(),
  pendingDocNames: z.array(z.string()),
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
  pendingGuestDocs: z.array(PendingGuestDocSummarySchema),
});

export type DashboardAppt = z.infer<typeof DashboardApptSchema>;
export type PendingGuestDocSummary = z.infer<typeof PendingGuestDocSummarySchema>;
export type ManagerDashboardResponse = z.infer<typeof ManagerDashboardResponseSchema>;
