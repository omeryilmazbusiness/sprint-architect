import { db } from "../../../db";
import { appointments, doctors } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";
import { tx } from "../../../tx/TransactionManager";
import type { IManagerDoctorsRepo } from "./ManagerDoctorsRepo";

export const managerDoctorsRepo: IManagerDoctorsRepo = {
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
