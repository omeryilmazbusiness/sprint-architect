import { db } from "../../../db";
import { patients, patientDocuments, appointments } from "@shared/schema";
import { eq, and, ilike, or, count, desc, sql, inArray } from "drizzle-orm";
import type {
  IManagerPatientsRepo,
  ListPatientsFilter,
  PatientListResult,
} from "./ManagerPatientsRepo";

export const managerPatientsRepo: IManagerPatientsRepo = {
  async listPatients(filter): Promise<PatientListResult> {
    const {
      clinicId,
      search,
      page = 1,
      pageSize = 20,
      status,
      pendingDocs,
      todayAppt,
    } = filter;

    const offset = (page - 1) * pageSize;
    const conditions: any[] = [eq(patients.clinicId, clinicId)];

    if (search) {
      conditions.push(
        or(
          ilike(patients.fullName, `%${search}%`),
          ilike(patients.patientKey, `%${search}%`),
        ),
      );
    }

    if (status && status !== "ALL") {
      conditions.push(eq(patients.status, status as any));
    }

    if (pendingDocs) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM patient_documents pd
          WHERE pd.patient_id = patients.id
            AND pd.status = 'ASSIGNED'
        )`,
      );
    }

    if (todayAppt) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.patient_id = patients.id
            AND a.clinic_id = ${clinicId}
            AND DATE(a.start_at AT TIME ZONE 'Europe/Istanbul')
                = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul')::date
            AND a.status = 'SCHEDULED'
        )`,
      );
    }

    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: patients.id,
          fullName: patients.fullName,
          patientKey: patients.patientKey,
          status: patients.status,
          arrivalDate: patients.arrivalDate,
          departureDate: patients.departureDate,
          phoneE164: patients.phoneE164,
          email: patients.email,
        })
        .from(patients)
        .where(where)
        .orderBy(desc(patients.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ count: count() }).from(patients).where(where),
    ]);

    if (rows.length === 0) {
      return { items: [], page, pageSize, totalCount: Number(totalRows[0]?.count ?? 0) };
    }

    const ids = rows.map((r) => r.id);

    const [pendingDocIds, todayApptIds] = await Promise.all([
      db
        .select({ patientId: patientDocuments.patientId })
        .from(patientDocuments)
        .where(
          and(
            inArray(patientDocuments.patientId, ids),
            eq(patientDocuments.status, "ASSIGNED"),
          ),
        )
        .then((rows) => new Set(rows.map((r) => r.patientId).filter(Boolean))),

      db
        .selectDistinct({ patientId: appointments.patientId })
        .from(appointments)
        .where(
          and(
            inArray(appointments.patientId, ids),
            eq(appointments.clinicId, clinicId),
            eq(appointments.status, "SCHEDULED"),
            sql`DATE(appointments.start_at AT TIME ZONE 'Europe/Istanbul')
                = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Istanbul')::date`,
          ),
        )
        .then((rows) => new Set(rows.map((r) => r.patientId).filter(Boolean))),
    ]);

    return {
      items: rows.map((r) => ({
        ...r,
        hasPendingDocs: pendingDocIds.has(r.id),
        hasTodayAppointment: todayApptIds.has(r.id),
      })),
      page,
      pageSize,
      totalCount: Number(totalRows[0]?.count ?? 0),
    };
  },
};
