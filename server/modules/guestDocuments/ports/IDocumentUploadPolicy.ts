export interface GuestUploadContext {
  mimeType: string;
  originalName: string;
  fileSizeBytes: number;
  documentStatus: string;
  patientId: string;
  documentPatientId: string;
  /** True when row exists for this guest + institution (manager assigned). */
  isAssignedToGuest: boolean;
  scheduledPurgeAt: Date | null;
  retentionPurgedAt: Date | null;
}

export interface IDocumentUploadPolicy {
  assertAllowed(ctx: GuestUploadContext): void;
}
