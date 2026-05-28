import { describe, it, expect } from "vitest";
import {
  archiveDueAt,
  departureRetentionFields,
  endOfCalendarDayInTimeZone,
  formatYmdInTimeZone,
} from "../domain/computeRetentionSchedule";

describe("computeRetentionSchedule", () => {
  it("endOfCalendarDayInTimeZone returns last instant of local day (Istanbul)", () => {
    const end = endOfCalendarDayInTimeZone("2026-06-15", "Europe/Istanbul");
    expect(formatYmdInTimeZone(end, "Europe/Istanbul")).toBe("2026-06-15");
    const next = new Date(end.getTime() + 1);
    expect(formatYmdInTimeZone(next, "Europe/Istanbul")).toBe("2026-06-16");
  });

  it("departureRetentionFields clears when no departure date", () => {
    expect(departureRetentionFields(null)).toEqual({
      scheduledPurgeAt: null,
      retentionSource: null,
      retentionArchiveSentAt: null,
      retentionPurgedAt: null,
    });
  });

  it("departureRetentionFields sets DEPARTURE source", () => {
    const f = departureRetentionFields("2026-03-01", "Europe/Istanbul");
    expect(f.retentionSource).toBe("DEPARTURE");
    expect(f.scheduledPurgeAt).toBeInstanceOf(Date);
    expect(f.retentionArchiveSentAt).toBeNull();
    expect(f.retentionPurgedAt).toBeNull();
  });

  it("archiveDueAt is one hour before purge by default", () => {
    const purge = new Date("2026-01-10T20:59:59.999Z");
    const due = archiveDueAt(purge, 1);
    expect(due.getTime()).toBe(purge.getTime() - 3600_000);
  });

  it("rejects invalid departure date format", () => {
    expect(() => endOfCalendarDayInTimeZone("03/01/2026", "Europe/Istanbul")).toThrow();
  });
});
