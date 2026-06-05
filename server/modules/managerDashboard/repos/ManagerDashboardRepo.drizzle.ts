import { and, count, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
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
  documentTypes,
  patientDocuments,
  patientPlans,
  patients,
} from "@shared/schema";
import type { IManagerDashboardRepo, ManagerDashboardData } from "./ManagerDashboardRepo";
import type { DashboardAppt, PendingGuestDocSummary } from "../schemas/managerDashboard.schemas";
import { isSensitiveDocumentType } from "@shared/communityUploadTypes";

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

    const pendingGuestDocs = await this.getPendingGuestDocs(clinicId);

    return {
      activeGuests,
      appointmentsToday,
      pendingDocuments,
      missingAssignments,
      upcomingNext7Days,
      arrivingThisMonth,
      todayAppointments: todayApptRows.map(mapAppt),
      monthAppointments: monthApptRows.map(mapAppt),
      pendingGuestDocs,
    };
  }

  private async getPendingGuestDocs(clinicId: string): Promise<PendingGuestDocSummary[]> {
    const rows = await db.query.patientDocuments.findMany({
      where: and(
        eq(patientDocuments.clinicId, clinicId),
        inArray(patientDocuments.status, ["ASSIGNED", "UPLOADED"]),
      ),
      with: {
        patient: { columns: { id: true, fullName: true } },
        documentType: { columns: { name: true } },
      },
    });

    const byPatient = new Map<
      string,
      { patientName: string; pending: number; uploaded: number; pendingDocNames: string[] }
    >();

    for (const row of rows) {
      if (!row.patient) continue;
      const pid = row.patient.id;
      if (!byPatient.has(pid)) {
        byPatient.set(pid, {
          patientName: row.patient.fullName,
          pending: 0,
          uploaded: 0,
          pendingDocNames: [],
        });
      }
      const entry = byPatient.get(pid)!;
      if (row.documentType?.name && isSensitiveDocumentType(row.documentType.name, null)) {
        continue;
      }
      if (row.status === "ASSIGNED") {
        entry.pending += 1;
        if (row.documentType?.name) {
          entry.pendingDocNames.push(row.documentType.name);
        }
      } else if (row.status === "UPLOADED") {
        entry.uploaded += 1;
      }
    }

    return Array.from(byPatient.entries())
      .filter(([, v]) => v.pending > 0)
      .sort((a, b) => b[1].pending - a[1].pending)
      .slice(0, 8)
      .map(([patientId, v]) => ({
        patientId,
        patientName: v.patientName,
        pending: v.pending,
        uploaded: v.uploaded,
        pendingDocNames: v.pendingDocNames,
      }));
  }
}

export const managerDashboardRepo = new DrizzleManagerDashboardRepo();
