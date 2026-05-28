import { db } from "../../../db";
import {
  patients,
  clinics,
  users,
  patientDocuments,
  documentTypes,
  appointments,
  doctors,
} from "@shared/schema";
import { and, asc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import type { GuestArchiveBundle } from "../domain/GuestArchiveBundle";
import type {
  GuestRetentionCandidate,
  IGuestRetentionReadRepo,
} from "../ports/IGuestRetentionReadRepo";

export const guestRetentionReadRepo: IGuestRetentionReadRepo = {
  async findDueForArchive(now: Date, archiveLeadMs: number): Promise<GuestRetentionCandidate[]> {
    const rows = await db.query.patients.findMany({
      where: and(
        isNotNull(patients.scheduledPurgeAt),
        isNull(patients.retentionArchiveSentAt),
        isNull(patients.retentionPurgedAt)
      ),
      columns: {
        id: true,
        clinicId: true,
        fullName: true,
        patientKey: true,
        scheduledPurgeAt: true,
      },
    });

    const threshold = now.getTime();
    return rows
      .filter(
        (r): r is typeof r & { scheduledPurgeAt: Date } =>
          r.scheduledPurgeAt != null && r.scheduledPurgeAt.getTime() - archiveLeadMs <= threshold
      )
      .map((r) => ({
        id: r.id,
        clinicId: r.clinicId,
        fullName: r.fullName,
        patientKey: r.patientKey,
        scheduledPurgeAt: r.scheduledPurgeAt,
      }));
  },

  async findDueForPurge(now: Date): Promise<GuestRetentionCandidate[]> {
    const rows = await db.query.patients.findMany({
      where: and(
        isNotNull(patients.scheduledPurgeAt),
        isNull(patients.retentionPurgedAt),
        lte(patients.scheduledPurgeAt, now)
      ),
      columns: {
        id: true,
        clinicId: true,
        fullName: true,
        patientKey: true,
        scheduledPurgeAt: true,
      },
    });

    return rows
      .filter((r): r is typeof r & { scheduledPurgeAt: Date } => r.scheduledPurgeAt != null)
      .map((r) => ({
        id: r.id,
        clinicId: r.clinicId,
        fullName: r.fullName,
        patientKey: r.patientKey,
        scheduledPurgeAt: r.scheduledPurgeAt,
      }));
  },

  async loadArchiveBundle(patientId: string, clinicId: string): Promise<GuestArchiveBundle | null> {
    const patient = await db.query.patients.findFirst({
      where: and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)),
    });
    if (!patient || !patient.scheduledPurgeAt) return null;

    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) });

    const docs = await db
      .select({
        typeName: documentTypes.name,
        status: patientDocuments.status,
        fileName: patientDocuments.fileName,
        uploadedAt: patientDocuments.uploadedAt,
        instructionText: patientDocuments.instructionText,
        fileUrl: patientDocuments.fileUrl,
      })
      .from(patientDocuments)
      .innerJoin(documentTypes, eq(patientDocuments.documentTypeId, documentTypes.id))
      .where(eq(patientDocuments.patientId, patientId));

    const visits = await db
      .select({
        title: appointments.title,
        startAt: appointments.startAt,
        status: appointments.status,
        providerName: doctors.fullName,
      })
      .from(appointments)
      .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
      .where(eq(appointments.patientId, patientId));

    const fileStorageKeys = docs
      .filter((d) => d.fileUrl && (d.status === "UPLOADED" || d.status === "APPROVED"))
      .map((d) => ({
        storageKey: d.fileUrl as string,
        fileName: d.fileName ?? "document.pdf",
      }));

    return {
      institutionName: clinic?.name ?? "Institution",
      guestKey: patient.patientKey,
      fullName: patient.fullName,
      email: patient.email,
      phone: patient.phone ?? patient.phoneE164,
      nationality: patient.nationality,
      arrivalDate: patient.arrivalDate,
      departureDate: patient.departureDate,
      status: patient.status,
      notes: patient.notes,
      scheduledPurgeAt: patient.scheduledPurgeAt,
      documents: docs.map((d) => ({
        typeName: d.typeName,
        status: d.status,
        fileName: d.fileName,
        uploadedAt: d.uploadedAt?.toISOString() ?? null,
        instructionText: d.instructionText,
      })),
      visits: visits.map((v) => ({
        title: v.title,
        startAt: v.startAt.toISOString(),
        status: v.status,
        providerName: v.providerName,
      })),
      fileStorageKeys,
    };
  },

  async resolveManagerRecipientEmail(clinicId: string): Promise<string | null> {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) });
    if (!clinic) return null;

    if (clinic.primaryManagerUserId) {
      const mgr = await db.query.users.findFirst({
        where: eq(users.id, clinic.primaryManagerUserId),
        columns: { email: true },
      });
      if (mgr?.email?.trim()) return mgr.email.trim();
    }

    const [fallback] = await db
      .select({ email: users.email })
      .from(users)
      .where(and(eq(users.clinicId, clinicId), eq(users.role, "MANAGER")))
      .orderBy(asc(users.createdAt))
      .limit(1);
    if (fallback?.email?.trim()) return fallback.email.trim();

    return clinic.contactEmail?.trim() ?? null;
  },

  async markArchiveSent(patientId: string, sentAt: Date): Promise<void> {
    await db
      .update(patients)
      .set({ retentionArchiveSentAt: sentAt })
      .where(eq(patients.id, patientId));
  },

  async markPurged(patientId: string, purgedAt: Date): Promise<void> {
    await db
      .update(patients)
      .set({ retentionPurgedAt: purgedAt })
      .where(eq(patients.id, patientId));
  },

  async findGuestForSelfDelete(patientId: string) {
    const row = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      columns: {
        id: true,
        clinicId: true,
        retentionPurgedAt: true,
        scheduledPurgeAt: true,
        retentionSource: true,
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      clinicId: row.clinicId,
      retentionPurgedAt: row.retentionPurgedAt,
      scheduledPurgeAt: row.scheduledPurgeAt,
      retentionSource: row.retentionSource,
    };
  },
};
