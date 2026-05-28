import type { GuestArchiveBundle } from "../domain/GuestArchiveBundle";

export interface GuestRetentionCandidate {
  id: string;
  clinicId: string;
  fullName: string;
  patientKey: string;
  scheduledPurgeAt: Date;
}

export interface IGuestRetentionReadRepo {
  findDueForArchive(now: Date, archiveLeadMs: number): Promise<GuestRetentionCandidate[]>;
  findDueForPurge(now: Date): Promise<GuestRetentionCandidate[]>;
  loadArchiveBundle(patientId: string, clinicId: string): Promise<GuestArchiveBundle | null>;
  resolveManagerRecipientEmail(clinicId: string): Promise<string | null>;
  markArchiveSent(patientId: string, sentAt: Date): Promise<void>;
  markPurged(patientId: string, purgedAt: Date): Promise<void>;
  findGuestForSelfDelete(patientId: string): Promise<{
    id: string;
    clinicId: string;
    retentionPurgedAt: Date | null;
    scheduledPurgeAt: Date | null;
    retentionSource: "DEPARTURE" | "SELF_DELETE" | null;
  } | null>;
}
