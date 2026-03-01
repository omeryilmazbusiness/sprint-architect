import { db } from "../db";
import { appointments, doctors, patients } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export interface CreateAppointmentInput {
  clinicId: string;
  patientId: string;
  doctorId?: string;
  title: string;
  type?: string;
  startAt: Date;
  endAt?: Date;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface UpdateAppointmentInput {
  doctorId?: string | null;
  title?: string;
  type?: string;
  startAt?: Date;
  endAt?: Date | null;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  status?: "SCHEDULED" | "DONE" | "CANCELLED";
}

export const appointmentRepo = {
  async create(input: CreateAppointmentInput) {
    const [appt] = await db.insert(appointments).values(input).returning();
    return appt;
  },

  async listForPatient(patientId: string, clinicId: string, from?: string, to?: string) {
    let where = and(
      eq(appointments.patientId, patientId),
      eq(appointments.clinicId, clinicId)
    );
    if (from) {
      where = and(where, gte(appointments.startAt, new Date(from)));
    }
    if (to) {
      where = and(where, lte(appointments.startAt, new Date(to)));
    }
    return db.query.appointments.findMany({
      where,
      with: { doctor: true },
      orderBy: (a, { asc }) => asc(a.startAt),
    });
  },

  async listForClinic(clinicId: string, from?: string, to?: string) {
    let where = eq(appointments.clinicId, clinicId);
    if (from) {
      where = and(where, gte(appointments.startAt, new Date(from))) as any;
    }
    if (to) {
      where = and(where, lte(appointments.startAt, new Date(to))) as any;
    }
    return db.query.appointments.findMany({
      where,
      with: {
        doctor: {
          columns: { id: true, fullName: true }
        },
        patient: {
          columns: { id: true, fullName: true }
        }
      },
      orderBy: (a, { asc }) => asc(a.startAt),
    });
  },

  async findById(id: string, clinicId: string) {
    return db.query.appointments.findFirst({
      where: and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)),
      with: { doctor: true, patient: true },
    });
  },

  async update(id: string, clinicId: string, input: UpdateAppointmentInput) {
    const [updated] = await db
      .update(appointments)
      .set(input)
      .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
      .returning();
    return updated;
  },

  async cancel(id: string, clinicId: string) {
    const [updated] = await db
      .update(appointments)
      .set({ status: "CANCELLED" })
      .where(and(eq(appointments.id, id), eq(appointments.clinicId, clinicId)))
      .returning();
    return updated;
  },

  async listUpcoming(clinicId: string, limit = 20) {
    return db.query.appointments.findMany({
      where: and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.status, "SCHEDULED")
      ),
      with: { doctor: true, patient: true },
      orderBy: (a, { asc }) => asc(a.startAt),
      limit,
    });
  },
};
