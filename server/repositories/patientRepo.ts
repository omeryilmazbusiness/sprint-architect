import { db } from "../db";
import { patients } from "@shared/schema";
import { eq, and, ilike, or, count } from "drizzle-orm";
import { generatePatientKey } from "../utils/patientKey";

export interface CreatePatientInput {
  clinicId: string;
  fullName: string;
  phone?: string;
  email?: string;
  nationality?: string;
  passportNo?: string;
  arrivalDate?: string;
  departureDate?: string;
  notes?: string;
}

export interface UpdatePatientInput {
  fullName?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  passportNo?: string;
  arrivalDate?: string;
  departureDate?: string;
  status?: "ACTIVE" | "INACTIVE" | "PENDING";
  notes?: string;
}

export const patientRepo = {
  async create(input: CreatePatientInput) {
    let patientKey: string;
    let attempts = 0;
    while (true) {
      patientKey = generatePatientKey();
      const existing = await db.query.patients.findFirst({
        where: eq(patients.patientKey, patientKey),
      });
      if (!existing) break;
      if (++attempts > 10) throw new Error("Failed to generate unique patient key");
    }

    const [patient] = await db
      .insert(patients)
      .values({ ...input, patientKey })
      .returning();
    return patient;
  },

  async list(clinicId: string, search?: string, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const where = search
      ? and(
          eq(patients.clinicId, clinicId),
          or(
            ilike(patients.fullName, `%${search}%`),
            ilike(patients.patientKey, `%${search}%`)
          )
        )
      : eq(patients.clinicId, clinicId);

    const [rows, total] = await Promise.all([
      db.query.patients.findMany({
        where,
        limit: pageSize,
        offset,
        orderBy: (p, { desc }) => desc(p.createdAt),
      }),
      db.select({ count: count() }).from(patients).where(where),
    ]);

    return { rows, total: Number(total[0].count), page, pageSize };
  },

  async findById(id: string, clinicId: string) {
    return db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.clinicId, clinicId)),
    });
  },

  async findByKey(patientKey: string) {
    return db.query.patients.findFirst({
      where: eq(patients.patientKey, patientKey),
    });
  },

  async update(id: string, clinicId: string, input: UpdatePatientInput) {
    const [updated] = await db
      .update(patients)
      .set(input)
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)))
      .returning();
    return updated;
  },

  async softDelete(id: string, clinicId: string) {
    const [updated] = await db
      .update(patients)
      .set({ status: "INACTIVE" })
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)))
      .returning();
    return updated;
  },
};
