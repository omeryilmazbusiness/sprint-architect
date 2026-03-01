import { db } from "../db";
import { patients, patientPlans, patientDocuments } from "@shared/schema";
import { eq, and, ilike, or, count, isNull, exists, sql } from "drizzle-orm";
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
  nationalityCode?: string;
  phoneE164?: string;
  dateOfBirth?: string;
  preferredLanguage?: string;
  emergencyContactName?: string;
  emergencyContactPhoneE164?: string;
  arrivalAirport?: string;
  flightNumber?: string;
  requestedService?: string;
}

export interface UpdatePatientInput {
  fullName?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  passportNo?: string;
  arrivalDate?: string;
  departureDate?: string;
  status?: "ACTIVE" | "INACTIVE" | "PENDING" | "APPROVED" | "ENDED";
  notes?: string;
  nationalityCode?: string;
  phoneE164?: string;
  dateOfBirth?: string;
  preferredLanguage?: string;
  emergencyContactName?: string;
  emergencyContactPhoneE164?: string;
  arrivalAirport?: string;
  flightNumber?: string;
  requestedService?: string;
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

  async list(clinicId: string, search?: string, page = 1, pageSize = 20, status?: string, missing?: string) {
    const offset = (page - 1) * pageSize;
    let conditions = [eq(patients.clinicId, clinicId)];
    
    if (search) {
      conditions.push(or(
        ilike(patients.fullName, `%${search}%`),
        ilike(patients.patientKey, `%${search}%`)
      )!);
    }
    
    if (status) {
      conditions.push(eq(patients.status, status as any));
    }

    if (missing) {
      if (missing === "missingHotel") {
        conditions.push(sql`NOT EXISTS (SELECT 1 FROM patient_plans WHERE patient_id = ${patients.id} AND hotel_id IS NOT NULL)`);
      } else if (missing === "missingTransport") {
        conditions.push(sql`NOT EXISTS (SELECT 1 FROM patient_plans WHERE patient_id = ${patients.id} AND transport_id IS NOT NULL)`);
      } else if (missing === "missingDoctor") {
        conditions.push(sql`NOT EXISTS (SELECT 1 FROM patient_plans WHERE patient_id = ${patients.id} AND doctor_id IS NOT NULL)`);
      } else if (missing === "missingDocuments") {
        conditions.push(sql`EXISTS (SELECT 1 FROM patient_documents WHERE patient_id = ${patients.id} AND status = 'ASSIGNED')`);
      }
    }

    const where = and(...conditions);

    const [rows, total] = await Promise.all([
      db.query.patients.findMany({
        where,
        limit: pageSize,
        offset,
        orderBy: (p, { desc }) => desc(p.createdAt),
        with: { plan: true }
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
