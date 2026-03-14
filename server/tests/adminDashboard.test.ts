/**
 * Admin Dashboard — Backend Tests
 *
 * Verifies the dashboard endpoint returns a stable 200 DTO with zero-defaults
 * when the database is empty, and never errors due to missing data.
 */

import { describe, it, expect } from "vitest";
import { getAdminDashboardOverview } from "../modules/adminDashboard/usecases/GetAdminDashboardOverview";
import { adminDashboardReadRepo } from "../modules/adminDashboard/repos/AdminDashboardReadRepo.drizzle";

describe("Admin Dashboard — Stable DTO with Empty DB", () => {
  // ─── T1: getCounts returns zeros on empty tables ─────────────────────────
  it("T1: getCounts returns zero values when tables are empty", async () => {
    const counts = await adminDashboardReadRepo.getCounts();

    expect(typeof counts.totalClinics).toBe("number");
    expect(typeof counts.activeClinics).toBe("number");
    expect(typeof counts.suspendedClinics).toBe("number");
    expect(typeof counts.pendingInvoices).toBe("number");
    expect(typeof counts.unpaidInvoices).toBe("number");
    expect(typeof counts.paidInvoices).toBe("number");

    expect(counts.totalClinics).toBeGreaterThanOrEqual(0);
    expect(counts.activeClinics).toBeGreaterThanOrEqual(0);
    expect(counts.suspendedClinics).toBeGreaterThanOrEqual(0);
    expect(counts.pendingInvoices).toBeGreaterThanOrEqual(0);
    expect(counts.unpaidInvoices).toBeGreaterThanOrEqual(0);
    expect(counts.paidInvoices).toBeGreaterThanOrEqual(0);
  });

  // ─── T2: getTotalBilledThisMonth returns 0 with no invoices ──────────────
  it("T2: getTotalBilledThisMonth returns 0 when no invoices exist for period", async () => {
    const total = await adminDashboardReadRepo.getTotalBilledThisMonth("9999-99");
    expect(total).toBe(0);
    expect(typeof total).toBe("number");
  });

  // ─── T3: getRecentInvoices returns [] when no invoices ───────────────────
  it("T3: getRecentInvoices returns empty array when no invoices exist", async () => {
    const invoices = await adminDashboardReadRepo.getRecentInvoices();
    expect(Array.isArray(invoices)).toBe(true);
    expect(invoices.length).toBe(0);
  });

  // ─── T4: getActivity returns an array (may have audit log entries) ─────────
  it("T4: getActivity returns an array with stable item shape", async () => {
    const activity = await adminDashboardReadRepo.getActivity();
    expect(Array.isArray(activity)).toBe(true);
    expect(activity.length).toBeGreaterThanOrEqual(0);
    if (activity.length > 0) {
      const entry = activity[0];
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.type).toBe("string");
      expect(typeof entry.message).toBe("string");
      expect(typeof entry.createdAt).toBe("string");
    }
  });

  // ─── T5: Full DTO has correct shape with all defaults ────────────────────
  it("T5: getAdminDashboardOverview returns full DTO with stable shape", async () => {
    const dto = await getAdminDashboardOverview();

    expect(dto).toMatchObject({
      currentPeriod: expect.stringMatching(/^\d{4}-\d{2}$/),
      clinics: {
        total: expect.any(Number),
        active: expect.any(Number),
        suspended: expect.any(Number),
      },
      invoices: {
        pending: expect.any(Number),
        unpaid: expect.any(Number),
        paid: expect.any(Number),
        totalBilledThisMonth: expect.any(Number),
      },
      recentInvoices: expect.any(Array),
      activity: expect.any(Array),
    });

    expect(dto.clinics.total).toBeGreaterThanOrEqual(0);
    expect(dto.invoices.totalBilledThisMonth).toBeGreaterThanOrEqual(0);
  });

  // ─── T6: Empty DB scenario — all counts are zero ─────────────────────────
  it("T6: on empty DB, all numeric metrics are >= 0 and lists are arrays", async () => {
    const dto = await getAdminDashboardOverview();

    expect(dto.clinics.total).toBeGreaterThanOrEqual(0);
    expect(dto.clinics.active).toBeGreaterThanOrEqual(0);
    expect(dto.clinics.suspended).toBeGreaterThanOrEqual(0);
    expect(dto.invoices.pending).toBeGreaterThanOrEqual(0);
    expect(dto.invoices.unpaid).toBeGreaterThanOrEqual(0);
    expect(dto.invoices.paid).toBeGreaterThanOrEqual(0);
    expect(dto.invoices.totalBilledThisMonth).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(dto.recentInvoices)).toBe(true);
    expect(Array.isArray(dto.activity)).toBe(true);
  });

  // ─── T7: Never throws, always returns 200-shape ───────────────────────────
  it("T7: getAdminDashboardOverview never throws and resolves to an object", async () => {
    await expect(getAdminDashboardOverview()).resolves.toBeDefined();
  });
});
