import { and, count, eq, gte, isNotNull, lte } from "drizzle-orm";
import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { db } from "../../../db";
import {
  appointments,
  patientDocuments,
  patientPlans,
  patients,
} from "@shared/schema";
import type { IManagerDashboardRepo, ManagerDashboardData } from "./ManagerDashboardRepo";
import type { DashboardAppt } from "../schemas/managerDashboard.schemas";

function mapAppt(a: {
  id: string;
  startAt: Date;
  title: string;
  status: string;
  patient?: { id: string; fullName: string } | null;
  doctor?: { id: string; fullName: string } | null;
}): DashboardAppt {
  return {
    id: a.id,
    startAt: a.startAt.toISOString(),
    title: a.title,
    status: a.status,
    patientId: a.patient?.id ?? null,
    patientName: a.patient?.fullName ?? "Guest",
    doctorName: a.doctor?.fullName ?? null,
  };
}

export class DrizzleManagerDashboardRepo implements IManagerDashboardRepo {
  async getData(clinicId: string): Promise<ManagerDashboardData> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const next7End = addDays(now, 7);
    const monthStartStr = format(monthStart, "yyyy-MM-dd");
    const monthEndStr = format(monthEnd, "yyyy-MM-dd");

    const [
      [{ activeGuests }],
      [{ appointmentsToday }],
      [{ pendingDocuments }],
      [{ completePlans }],
      [{ upcomingNext7Days }],
      [{ arrivingThisMonth }],
      todayApptRows,
      monthApptRows,
    ] = await Promise.all([
      db
        .select({ activeGuests: count() })
        .from(patients)
        .where(and(eq(patients.clinicId, clinicId), eq(patients.status, "ACTIVE"))),

      db
        .select({ appointmentsToday: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.status, "SCHEDULED"),
            gte(appointments.startAt, todayStart),
            lte(appointments.startAt, todayEnd),
          ),
        ),

      db
        .select({ pendingDocuments: count() })
        .from(patientDocuments)
        .where(
          and(
            eq(patientDocuments.clinicId, clinicId),
            eq(patientDocuments.status, "ASSIGNED"),
          ),
        ),

      db
        .select({ completePlans: count() })
        .from(patientPlans)
        .where(
          and(
            eq(patientPlans.clinicId, clinicId),
            isNotNull(patientPlans.hotelId),
            isNotNull(patientPlans.transportId),
            isNotNull(patientPlans.doctorId),
          ),
        ),

      db
        .select({ upcomingNext7Days: count() })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            eq(appointments.status, "SCHEDULED"),
            gte(appointments.startAt, now),
            lte(appointments.startAt, next7End),
          ),
        ),

      db
        .select({ arrivingThisMonth: count() })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            gte(patients.arrivalDate, monthStartStr),
            lte(patients.arrivalDate, monthEndStr),
          ),
        ),

      db.query.appointments.findMany({
        where: and(
          eq(appointments.clinicId, clinicId),
          gte(appointments.startAt, todayStart),
          lte(appointments.startAt, todayEnd),
        ),
        with: {
          patient: { columns: { id: true, fullName: true } },
          doctor: { columns: { id: true, fullName: true } },
        },
        orderBy: (a, { asc }) => asc(a.startAt),
      }),

      db.query.appointments.findMany({
        where: and(
          eq(appointments.clinicId, clinicId),
          gte(appointments.startAt, monthStart),
          lte(appointments.startAt, monthEnd),
        ),
        with: {
          patient: { columns: { id: true, fullName: true } },
          doctor: { columns: { id: true, fullName: true } },
        },
        orderBy: (a, { asc }) => asc(a.startAt),
      }),
    ]);

    const missingAssignments = Math.max(0, activeGuests - completePlans);

    return {
      activeGuests,
      appointmentsToday,
      pendingDocuments,
      missingAssignments,
      upcomingNext7Days,
      arrivingThisMonth,
      todayAppointments: todayApptRows.map(mapAppt),
      monthAppointments: monthApptRows.map(mapAppt),
    };
  }
}

export const managerDashboardRepo = new DrizzleManagerDashboardRepo();
