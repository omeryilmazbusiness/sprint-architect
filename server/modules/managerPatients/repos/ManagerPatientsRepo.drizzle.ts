import { db } from "../../../db";
import { patients, patientDocuments, appointments } from "@shared/schema";
import { eq, and, ilike, or, count, desc, sql, inArray } from "drizzle-orm";
import type {
  IManagerPatientsRepo,
  ListPatientsFilter,
  PatientListResult,
  ApprovePatientInput,
  ApprovePatientResult,
  DocSummaryItem,
  ListDocSummariesFilter,
} from "./ManagerPatientsRepo";
import { AppError } from "../../../auth/errors";

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

  async approvePatient({ patientId, clinicId }: ApprovePatientInput): Promise<ApprovePatientResult> {
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)),
    });

    if (!patient) {
      throw new AppError("NOT_FOUND", "Patient not found", 404);
    }

    if (patient.status === "APPROVED") {
      const period = patient.arrivalDate
        ? patient.arrivalDate.slice(0, 7)
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
      return { alreadyApproved: true, approvedAt: patient.approvedAt ?? new Date(), billingPeriod: period };
    }

    const now = new Date();
    const period = patient.arrivalDate
      ? patient.arrivalDate.slice(0, 7)
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await db
      .update(patients)
      .set({ status: "APPROVED", approvedAt: now } as any)
      .where(eq(patients.id, patientId));

    return { alreadyApproved: false, approvedAt: now, billingPeriod: period };
  },

  async listDocSummaries(filter): Promise<DocSummaryItem[]> {
    const { clinicId, search, filter: docFilter = "ALL" } = filter;

    const rows = await db.query.patientDocuments.findMany({
      where: and(
        eq(patientDocuments.clinicId, clinicId),
        inArray(patientDocuments.status, ["ASSIGNED", "UPLOADED", "APPROVED", "REJECTED"]),
      ),
      with: {
        patient: { columns: { id: true, fullName: true } },
        documentType: { columns: { name: true } },
      },
    });

    const byPatient = new Map<
      string,
      {
        patientName: string;
        pending: number;
        uploaded: number;
        approved: number;
        rejected: number;
        pendingDocNames: string[];
      }
    >();

    for (const row of rows) {
      if (!row.patient) continue;
      const pid = row.patient.id;
      if (!byPatient.has(pid)) {
        byPatient.set(pid, {
          patientName: row.patient.fullName,
          pending: 0,
          uploaded: 0,
          approved: 0,
          rejected: 0,
          pendingDocNames: [],
        });
      }
      const entry = byPatient.get(pid)!;
      if (row.status === "ASSIGNED") {
        entry.pending += 1;
        if (row.documentType?.name) entry.pendingDocNames.push(row.documentType.name);
      } else if (row.status === "UPLOADED") {
        entry.uploaded += 1;
      } else if (row.status === "APPROVED") {
        entry.approved += 1;
      } else if (row.status === "REJECTED") {
        entry.rejected += 1;
      }
    }

    let results = Array.from(byPatient.entries()).map(([patientId, v]) => ({
      patientId,
      patientName: v.patientName,
      pending: v.pending,
      uploaded: v.uploaded,
      approved: v.approved,
      rejected: v.rejected,
      total: v.pending + v.uploaded + v.approved + v.rejected,
      pendingDocNames: v.pendingDocNames,
    }));

    // Apply search filter
    if (search) {
      const lc = search.toLowerCase();
      results = results.filter((r) => r.patientName.toLowerCase().includes(lc));
    }

    // Apply status filter
    if (docFilter === "HAS_PENDING") {
      results = results.filter((r) => r.pending > 0);
    } else if (docFilter === "FULLY_UPLOADED") {
      results = results.filter((r) => r.pending === 0 && r.uploaded > 0);
    } else if (docFilter === "HAS_REJECTED") {
      results = results.filter((r) => r.rejected > 0);
    }

    // Sort: pending desc, then by name
    results.sort((a, b) => {
      if (b.pending !== a.pending) return b.pending - a.pending;
      return a.patientName.localeCompare(b.patientName);
    });

    return results;
  },
};
