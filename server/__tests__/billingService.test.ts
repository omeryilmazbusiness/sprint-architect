import { describe, it, expect, vi, beforeEach } from "vitest";

function makeChain(returnValue: unknown) {
  const chain: {
    set: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    returning: ReturnType<typeof vi.fn>;
  } = {
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(() => Promise.resolve(returnValue)),
  };
  return chain;
}

vi.mock("../db", () => ({
  db: {
    query: {
      clinics: { findMany: vi.fn() },
      invoices: { findFirst: vi.fn(), findMany: vi.fn() },
    },
    select: vi.fn(),
    update: vi.fn(() => makeChain([])),
    insert: vi.fn(),
    transaction: vi.fn(async (fn: (trx: { update: ReturnType<typeof vi.fn> }) => Promise<void>) => {
      const trx = { update: vi.fn(() => makeChain([])) };
      return fn(trx);
    }),
  },
}));

vi.mock("../api/auditLogger", () => ({
  auditLog: vi.fn(),
}));

vi.mock("../email/getEmailProvider", () => ({
  getEmailProvider: () => ({ send: vi.fn() }),
}));

vi.mock("../email/templates", () => ({
  invoiceEmailHtml: vi.fn(() => "<html/>"),
  invoiceEmailText: vi.fn(() => "text"),
  monthlyReportHtml: vi.fn(() => "<html/>"),
  monthlyReportText: vi.fn(() => "text"),
}));

import { db } from "../db";
import { markOverdueInvoicesAsUnpaid, reactivateClinicAfterPayment } from "../billing/billingService";
import { auditLog } from "../api/auditLogger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDb = db as any;

function mockTransaction() {
  const trxUpdate = vi.fn(() => makeChain([]));
  mockDb.transaction = vi.fn(async (fn: (trx: { update: typeof trxUpdate }) => Promise<void>) => {
    await fn({ update: trxUpdate });
  });
  return trxUpdate;
}

describe("RollPendingToUnpaid — markOverdueInvoicesAsUnpaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when no overdue invoices", async () => {
    mockDb.query.invoices.findMany.mockResolvedValue([]);
    await markOverdueInvoicesAsUnpaid();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it("marks overdue invoices UNPAID and suspends their clinics", async () => {
    const overdueInvoices = [
      { id: "inv-1", clinicId: "clinic-A", status: "PENDING" },
      { id: "inv-2", clinicId: "clinic-A", status: "PENDING" },
      { id: "inv-3", clinicId: "clinic-B", status: "PENDING" },
    ];
    mockDb.query.invoices.findMany.mockResolvedValue(overdueInvoices);

    const trxUpdate = mockTransaction();

    await markOverdueInvoicesAsUnpaid();

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(trxUpdate).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledTimes(2);

    const logCalls = (auditLog as any).mock.calls;
    const clinicALog = logCalls.find((c: any) => c[0].clinicId === "clinic-A");
    const clinicBLog = logCalls.find((c: any) => c[0].clinicId === "clinic-B");
    expect(clinicALog).toBeDefined();
    expect(clinicBLog).toBeDefined();
    expect(clinicALog[0].action).toBe("clinic.suspended_unpaid_invoice");
    expect(clinicBLog[0].action).toBe("clinic.suspended_unpaid_invoice");
    expect(clinicALog[0].metadata.invoiceIds).toContain("inv-1");
    expect(clinicALog[0].metadata.invoiceIds).toContain("inv-2");
    expect(clinicBLog[0].metadata.invoiceIds).toContain("inv-3");
  });

  it("suspends each unique clinic exactly once even if multiple invoices belong to it", async () => {
    const overdueInvoices = [
      { id: "inv-1", clinicId: "clinic-X", status: "PENDING" },
      { id: "inv-2", clinicId: "clinic-X", status: "PENDING" },
      { id: "inv-3", clinicId: "clinic-X", status: "PENDING" },
    ];
    mockDb.query.invoices.findMany.mockResolvedValue(overdueInvoices);
    mockTransaction();

    await markOverdueInvoicesAsUnpaid();

    const logCalls = (auditLog as any).mock.calls;
    const suspensionLogs = logCalls.filter((c: any) => c[0].action === "clinic.suspended_unpaid_invoice");
    expect(suspensionLogs).toHaveLength(1);
  });
});

describe("MarkInvoicePaid — reactivateClinicAfterPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reactivates clinic and users, logs reactivation", async () => {
    const trxUpdate = mockTransaction();

    await reactivateClinicAfterPayment("clinic-1", "admin-user-1");

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(trxUpdate).toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicId: "clinic-1",
        actorId: "admin-user-1",
        actorRole: "ADMIN",
        action: "clinic.reactivated_after_payment",
      })
    );
  });

  it("uses 'system' as actor when no paidByUserId provided", async () => {
    mockTransaction();

    await reactivateClinicAfterPayment("clinic-2");

    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "system",
        actorRole: "SYSTEM",
      })
    );
  });
});
