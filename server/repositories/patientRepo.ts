import { db } from "../db";
import { patients, patientPlans, patientDocuments } from "@shared/schema";
import { eq, and, ilike, or, count, isNull, exists, sql, inArray } from "drizzle-orm";
import { generatePatientKey, MAX_KEY_ATTEMPTS } from "../utils/patientKey";

function serializeServices(services: string[] | undefined): string | null {
  if (!services || services.length === 0) return null;
  return JSON.stringify(services);
}

function parseServices(raw: string | null | undefined, legacySingle: string | null | undefined): string[] {
  if (raw) {
    try { return JSON.parse(raw) as string[]; } catch { return [raw]; }
  }
  if (legacySingle) return [legacySingle];
  return [];
}

export interface CreatePatientInput {
  clinicId: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  nationalityCode?: string;
  passportNo?: string;
  phoneE164?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhoneE164?: string;
  companionRelation?: string;
  arrivalDate?: string;
  departureDate?: string;
  arrivalAirport?: string;
  flightNumber?: string;
  requestedServices?: string[];
  requestedService?: string;
  notes?: string;
  preferredLanguage?: string;
}

export interface UpdatePatientInput {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  nationalityCode?: string;
  passportNo?: string;
  phoneE164?: string;
  phone?: string;
  email?: string;
  emergencyContactName?: string;
  emergencyContactPhoneE164?: string;
  companionRelation?: string;
  arrivalDate?: string;
  departureDate?: string;
  arrivalAirport?: string;
  flightNumber?: string;
  requestedServices?: string[];
  requestedService?: string;
  notes?: string;
  preferredLanguage?: string;
  status?: "ACTIVE" | "INACTIVE" | "PENDING" | "APPROVED" | "ENDED";
}

function enrichPatient<T extends { requestedServices: string | null; requestedService: string | null }>(row: T) {
  return {
    ...row,
    requestedServices: parseServices(row.requestedServices, row.requestedService),
  };
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
      if (++attempts >= MAX_KEY_ATTEMPTS) throw new Error("Failed to generate unique patient key after max attempts");
    }

    const { requestedServices: servicesArr, ...rest } = input;
    const [patient] = await db
      .insert(patients)
      .values({
        ...rest,
        patientKey,
        requestedServices: serializeServices(servicesArr),
      } as any)
      .returning();
    return enrichPatient(patient);
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

    const patientIds = rows.map((r) => r.id);
    let pendingDocMap: Record<string, number> = {};
    if (patientIds.length > 0) {
      const docCounts = await db
        .select({ patientId: patientDocuments.patientId, cnt: count() })
        .from(patientDocuments)
        .where(
          and(
            inArray(patientDocuments.patientId, patientIds),
            eq(patientDocuments.status, "ASSIGNED"),
          ),
        )
        .groupBy(patientDocuments.patientId);
      docCounts.forEach((d) => {
        if (d.patientId) pendingDocMap[d.patientId] = Number(d.cnt);
      });
    }

    const enrichedRows = rows.map((r) => ({
      ...enrichPatient(r),
      pendingDocCount: pendingDocMap[r.id] ?? 0,
    }));

    return { rows: enrichedRows, total: Number(total[0].count), page, pageSize };
  },

  async findById(id: string, clinicId: string) {
    const row = await db.query.patients.findFirst({
      where: and(eq(patients.id, id), eq(patients.clinicId, clinicId)),
    });
    if (!row) return null;
    return enrichPatient(row);
  },

  async findByKey(patientKey: string) {
    const row = await db.query.patients.findFirst({
      where: eq(patients.patientKey, patientKey),
    });
    if (!row) return null;
    return enrichPatient(row);
  },

  async update(id: string, clinicId: string, input: UpdatePatientInput) {
    const { requestedServices: servicesArr, ...rest } = input;
    const setData: any = { ...rest };
    if (servicesArr !== undefined) {
      setData.requestedServices = serializeServices(servicesArr);
    }
    const [updated] = await db
      .update(patients)
      .set(setData)
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)))
      .returning();
    return enrichPatient(updated);
  },

  async softDelete(id: string, clinicId: string) {
    const [updated] = await db
      .update(patients)
      .set({ status: "INACTIVE" })
      .where(and(eq(patients.id, id), eq(patients.clinicId, clinicId)))
      .returning();
    return enrichPatient(updated);
  },
};
