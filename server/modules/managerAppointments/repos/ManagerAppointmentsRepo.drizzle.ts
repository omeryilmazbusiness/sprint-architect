import { and, eq, gte, lte } from "drizzle-orm";
import { endOfDay, startOfDay } from "date-fns";
import { db } from "../../../db";
import { appointments } from "@shared/schema";
import type { IManagerAppointmentsRepo } from "./ManagerAppointmentsRepo";
import type { TodayAppointmentItem } from "../schemas/managerAppointments.schemas";

export class DrizzleManagerAppointmentsRepo implements IManagerAppointmentsRepo {
  async getTodayAppointments(clinicId: string): Promise<TodayAppointmentItem[]> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const rows = await db.query.appointments.findMany({
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
    });

    return rows.map((a) => ({
      id: a.id,
      startAt: a.startAt.toISOString(),
      title: a.title,
      status: a.status,
      patientId: a.patient?.id ?? null,
      patientName: a.patient?.fullName ?? "Guest",
      doctorName: a.doctor?.fullName ?? null,
    }));
  }
}

export const managerAppointmentsRepo = new DrizzleManagerAppointmentsRepo();
