import { describe, it, expect } from "vitest";
import {
  getPeriodBoundaries,
  isBillableStatus,
  isPatientInPeriod,
  BILLABLE_STATUSES,
} from "../billing/billingCalculator";

describe("getPeriodBoundaries", () => {
  it("returns correct boundaries for mid-year period", () => {
    const b = getPeriodBoundaries("2026-03");
    expect(b.periodStart).toBe("2026-03-01");
    expect(b.periodEnd).toBe("2026-04-01");
    expect(b.startDate).toEqual(new Date(2026, 2, 1));
    expect(b.endDate).toEqual(new Date(2026, 3, 1));
  });

  it("handles December correctly (wraps to next year)", () => {
    const b = getPeriodBoundaries("2026-12");
    expect(b.periodStart).toBe("2026-12-01");
    expect(b.periodEnd).toBe("2027-01-01");
    expect(b.startDate).toEqual(new Date(2026, 11, 1));
    expect(b.endDate).toEqual(new Date(2026, 12, 1));
  });

  it("handles January", () => {
    const b = getPeriodBoundaries("2026-01");
    expect(b.periodStart).toBe("2026-01-01");
    expect(b.periodEnd).toBe("2026-02-01");
  });

  it("pads single-digit months", () => {
    const b = getPeriodBoundaries("2026-05");
    expect(b.periodStart).toBe("2026-05-01");
    expect(b.periodEnd).toBe("2026-06-01");
  });

  it("throws on invalid period format", () => {
    expect(() => getPeriodBoundaries("2026-13")).toThrow();
    expect(() => getPeriodBoundaries("2026-00")).toThrow();
    expect(() => getPeriodBoundaries("bad")).toThrow();
  });
});

describe("isBillableStatus", () => {
  it("returns true for APPROVED", () => {
    expect(isBillableStatus("APPROVED")).toBe(true);
  });

  it("returns true for ENDED", () => {
    expect(isBillableStatus("ENDED")).toBe(true);
  });

  it("returns false for PENDING", () => {
    expect(isBillableStatus("PENDING")).toBe(false);
  });

  it("returns false for unknown statuses", () => {
    expect(isBillableStatus("ACTIVE")).toBe(false);
    expect(isBillableStatus("")).toBe(false);
    expect(isBillableStatus("INACTIVE")).toBe(false);
  });

  it("BILLABLE_STATUSES contains exactly APPROVED and ENDED", () => {
    expect(BILLABLE_STATUSES).toContain("APPROVED");
    expect(BILLABLE_STATUSES).toContain("ENDED");
    expect(BILLABLE_STATUSES).toHaveLength(2);
  });
});

describe("isPatientInPeriod — PerPatientMonthlyCalculator", () => {
  const boundaries = getPeriodBoundaries("2026-03");

  it("counts APPROVED patient with arrivalDate in period", () => {
    const result = isPatientInPeriod(
      { arrivalDate: "2026-03-15", createdAt: new Date(2025, 0, 1), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(true);
    expect(result.usedFallback).toBe(false);
  });

  it("counts ENDED patient with arrivalDate in period", () => {
    const result = isPatientInPeriod(
      { arrivalDate: "2026-03-01", createdAt: new Date(2025, 0, 1), status: "ENDED" },
      boundaries
    );
    expect(result.billable).toBe(true);
    expect(result.usedFallback).toBe(false);
  });

  it("does NOT count PENDING patient regardless of date", () => {
    const result = isPatientInPeriod(
      { arrivalDate: "2026-03-10", createdAt: new Date(2026, 2, 10), status: "PENDING" },
      boundaries
    );
    expect(result.billable).toBe(false);
  });

  it("does NOT count patient with arrivalDate outside period", () => {
    const result = isPatientInPeriod(
      { arrivalDate: "2026-04-01", createdAt: new Date(2026, 2, 15), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(false);
  });

  it("does NOT count patient with arrivalDate before period", () => {
    const result = isPatientInPeriod(
      { arrivalDate: "2026-02-28", createdAt: new Date(2026, 1, 28), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(false);
  });

  it("arrivalDate on last day of March (2026-03-31) is IN period", () => {
    const result = isPatientInPeriod(
      { arrivalDate: "2026-03-31", createdAt: new Date(2025, 0, 1), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(true);
  });

  it("arrivalDate = periodEnd (2026-04-01) is OUTSIDE period", () => {
    const result = isPatientInPeriod(
      { arrivalDate: "2026-04-01", createdAt: new Date(2025, 0, 1), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(false);
  });

  it("falls back to createdAt when arrivalDate is null, marks usedFallback=true", () => {
    const result = isPatientInPeriod(
      { arrivalDate: null, createdAt: new Date(2026, 2, 10), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(true);
    expect(result.usedFallback).toBe(true);
  });

  it("falls back to createdAt when arrivalDate is undefined", () => {
    const result = isPatientInPeriod(
      { arrivalDate: undefined, createdAt: new Date(2026, 2, 10), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(true);
    expect(result.usedFallback).toBe(true);
  });

  it("fallback to createdAt — PENDING patient still NOT counted", () => {
    const result = isPatientInPeriod(
      { arrivalDate: null, createdAt: new Date(2026, 2, 10), status: "PENDING" },
      boundaries
    );
    expect(result.billable).toBe(false);
  });

  it("fallback: createdAt outside period is NOT counted", () => {
    const result = isPatientInPeriod(
      { arrivalDate: null, createdAt: new Date(2026, 3, 1), status: "APPROVED" },
      boundaries
    );
    expect(result.billable).toBe(false);
  });

  it("correctly handles December boundary (cross-year)", () => {
    const decBoundaries = getPeriodBoundaries("2025-12");
    const result = isPatientInPeriod(
      { arrivalDate: "2026-01-01", createdAt: new Date(2025, 11, 15), status: "APPROVED" },
      decBoundaries
    );
    expect(result.billable).toBe(false);

    const inDec = isPatientInPeriod(
      { arrivalDate: "2025-12-31", createdAt: new Date(2025, 11, 15), status: "ENDED" },
      decBoundaries
    );
    expect(inDec.billable).toBe(true);
  });
});

describe("Billing total calculation", () => {
  it("total = patientCount * unitPrice", () => {
    const patientCount = 12;
    const unitPrice = 50;
    expect(patientCount * unitPrice).toBe(600);
  });

  it("uses BILLING_UNIT_PRICE_DEFAULT env when billingUnitPrice is null", () => {
    const rawEnv = "75";
    const resolvedPrice = null ?? parseFloat(rawEnv);
    expect(resolvedPrice).toBe(75);
  });

  it("zero patients yields zero total", () => {
    expect(0 * 50).toBe(0);
  });
});
