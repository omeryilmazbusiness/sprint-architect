import { describe, it, expect, vi, beforeEach } from "vitest";
import { AssignDocumentsToGuest } from "../usecases/AssignDocumentsToGuest";
import type { IGuestDocumentAssignmentRepo } from "../ports/IGuestDocumentAssignmentRepo";

vi.mock("../../../services/NotificationService", () => ({
  notificationService: { emitGuestNotification: vi.fn().mockResolvedValue(undefined) },
}));

describe("AssignDocumentsToGuest", () => {
  const repo: IGuestDocumentAssignmentRepo = {
    findDocumentType: vi.fn(),
    assignToGuest: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unknown document types", async () => {
    vi.mocked(repo.findDocumentType).mockResolvedValue(null);
    const uc = new AssignDocumentsToGuest(repo);

    await expect(
      uc.execute({
        clinicId: "c1",
        patientId: "p1",
        items: [{ documentTypeId: "bad" }],
      })
    ).rejects.toMatchObject({ code: "DOC-ASSIGN-404" });
  });

  it("assigns and returns rows", async () => {
    vi.mocked(repo.findDocumentType).mockResolvedValue({ id: "dt1", name: "Passport" });
    vi.mocked(repo.assignToGuest).mockResolvedValue([
      {
        id: "d1",
        patientId: "p1",
        clinicId: "c1",
        documentTypeId: "dt1",
        status: "ASSIGNED",
        instructionText: null,
        isNewAssignment: true,
      },
    ]);

    const uc = new AssignDocumentsToGuest(repo);
    const rows = await uc.execute({
      clinicId: "c1",
      patientId: "p1",
      items: [{ documentTypeId: "dt1", instructionText: "Scan" }],
    });

    expect(rows).toHaveLength(1);
    expect(repo.assignToGuest).toHaveBeenCalled();
  });
});
