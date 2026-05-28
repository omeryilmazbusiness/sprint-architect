/** Snapshot used for pre-purge PDF/ZIP export (operational data only). */

export interface GuestArchiveDocumentRow {
  typeName: string;
  status: string;
  fileName: string | null;
  uploadedAt: string | null;
  instructionText: string | null;
}

export interface GuestArchiveVisitRow {
  title: string;
  startAt: string;
  status: string;
  providerName: string | null;
}

export interface GuestArchiveBundle {
  institutionName: string;
  guestKey: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  arrivalDate: string | null;
  departureDate: string | null;
  status: string;
  notes: string | null;
  scheduledPurgeAt: Date;
  documents: GuestArchiveDocumentRow[];
  visits: GuestArchiveVisitRow[];
  /** Storage keys for uploaded PDFs to include in ZIP */
  fileStorageKeys: { storageKey: string; fileName: string }[];
}
