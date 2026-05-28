import { describe, it, expect } from "vitest";
import { OperationalDocumentUploadPolicy } from "../infra/OperationalDocumentUploadPolicy";
import type { GuestUploadContext } from "../ports/IDocumentUploadPolicy";

function baseCtx(overrides: Partial<GuestUploadContext> = {}): GuestUploadContext {
  return {
    mimeType: "application/pdf",
    originalName: "passport.pdf",
    fileSizeBytes: 1024,
    documentStatus: "ASSIGNED",
    patientId: "p1",
    documentPatientId: "p1",
    isAssignedToGuest: true,
    scheduledPurgeAt: new Date(Date.now() + 86400_000),
    retentionPurgedAt: null,
    ...overrides,
  };
}

describe("OperationalDocumentUploadPolicy", () => {
  const policy = new OperationalDocumentUploadPolicy();

  it("allows assigned PDF upload", () => {
    expect(() => policy.assertAllowed(baseCtx())).not.toThrow();
  });

  it("blocks when not assigned to guest", () => {
    expect(() => policy.assertAllowed(baseCtx({ isAssignedToGuest: false }))).toThrow(
      /not assigned to you/
    );
  });

  it("blocks upload after scheduled purge time", () => {
    expect(() =>
      policy.assertAllowed(baseCtx({ scheduledPurgeAt: new Date(Date.now() - 1000) }))
    ).toThrow(/Upload period has ended/);
  });

  it("blocks when status is not uploadable", () => {
    expect(() => policy.assertAllowed(baseCtx({ documentStatus: "APPROVED" }))).toThrow(
      /not available for upload/
    );
  });
});
