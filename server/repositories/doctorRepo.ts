import { db } from "../db";
import { doctors } from "@shared/schema";
import { eq, and, ilike, count } from "drizzle-orm";

export interface CreateDoctorInput {
  clinicId: string;
  fullName: string;
  specialty?: string;
  phone?: string;
  photoUrl?: string;
}

export const doctorRepo = {
  async create(input: CreateDoctorInput) {
    const [doctor] = await db.insert(doctors).values(input).returning();
    return doctor;
  },

  async list(clinicId: string, search?: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const where = search
      ? and(eq(doctors.clinicId, clinicId), ilike(doctors.fullName, `%${search}%`))
      : eq(doctors.clinicId, clinicId);

    const [rows, total] = await Promise.all([
      db.query.doctors.findMany({
        where,
        limit: pageSize,
        offset,
        orderBy: (d, { asc }) => asc(d.fullName),
      }),
      db.select({ count: count() }).from(doctors).where(where),
    ]);

    return { rows, total: Number(total[0].count) };
  },

  async findById(id: string, clinicId: string) {
    return db.query.doctors.findFirst({
      where: and(eq(doctors.id, id), eq(doctors.clinicId, clinicId)),
    });
  },

  async update(id: string, clinicId: string, input: Partial<CreateDoctorInput>) {
    const [updated] = await db
      .update(doctors)
      .set(input)
      .where(and(eq(doctors.id, id), eq(doctors.clinicId, clinicId)))
      .returning();
    return updated;
  },

  async delete(id: string, clinicId: string) {
    const [deleted] = await db
      .delete(doctors)
      .where(and(eq(doctors.id, id), eq(doctors.clinicId, clinicId)))
      .returning();
    return deleted;
  },
};
