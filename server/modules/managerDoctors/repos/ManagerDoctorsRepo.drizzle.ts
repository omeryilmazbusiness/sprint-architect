import { db } from "../../../db";
import { appointments, doctors } from "@shared/schema";
import { eq, and, count, ilike, or, asc } from "drizzle-orm";
import { tx } from "../../../tx/TransactionManager";
import type { IManagerDoctorsRepo, DoctorDTO } from "./ManagerDoctorsRepo";
import type { CreateDoctorInput, UpdateDoctorInput } from "../schemas/managerDoctors.schemas";

export const managerDoctorsRepo: IManagerDoctorsRepo = {
  async listDoctors(clinicId: string, search?: string): Promise<{ rows: DoctorDTO[]; total: number }> {
    const where = search
      ? and(
          eq(doctors.clinicId, clinicId),
          or(
            ilike(doctors.fullName, `%${search}%`),
            ilike(doctors.specialty, `%${search}%`),
          ),
        )
      : eq(doctors.clinicId, clinicId);

    const [rows, totalRows] = await Promise.all([
      db.select().from(doctors).where(where).orderBy(asc(doctors.fullName)),
      db.select({ cnt: count() }).from(doctors).where(where),
    ]);

    return { rows: rows as DoctorDTO[], total: Number(totalRows[0]?.cnt ?? 0) };
  },

  async createDoctor(clinicId: string, input: CreateDoctorInput): Promise<DoctorDTO> {
    const [doctor] = await db
      .insert(doctors)
      .values({ clinicId, ...input })
      .returning();
    return doctor as DoctorDTO;
  },

  async updateDoctor(doctorId: string, clinicId: string, input: UpdateDoctorInput): Promise<DoctorDTO | null> {
    const [updated] = await db
      .update(doctors)
      .set(input)
      .where(and(eq(doctors.id, doctorId), eq(doctors.clinicId, clinicId)))
      .returning();
    return (updated as DoctorDTO) ?? null;
  },

  async hasAppointments(doctorId: string): Promise<boolean> {
    const [row] = await db
      .select({ cnt: count() })
      .from(appointments)
      .where(eq(appointments.doctorId, doctorId));
    return Number(row?.cnt ?? 0) > 0;
  },

  async deleteDoctor(doctorId: string, clinicId: string): Promise<boolean> {
    return tx.run(async (trx) => {
      const [deleted] = await trx
        .delete(doctors)
        .where(and(eq(doctors.id, doctorId), eq(doctors.clinicId, clinicId)))
        .returning({ id: doctors.id });
      return !!deleted;
    });
  },
};
