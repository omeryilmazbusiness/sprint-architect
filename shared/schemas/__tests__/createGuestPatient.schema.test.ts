import { describe, it, expect } from "vitest";
import { createGuestPatientSchema } from "../createGuestPatient.schema";

const base = {
  fullName: "Jane Doe",
  nationality: "Turkey",
  nationalityCode: "TR",
  phoneE164: "+905551234567",
  arrivalDate: "2026-06-01",
  departureDate: "2026-06-10",
};

describe("createGuestPatientSchema", () => {
  it("accepts canonical service codes", () => {
    const result = createGuestPatientSchema.safeParse({
      ...base,
      requestedServices: ["RHINOPLASTY", "DENTAL"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestedServices).toEqual(["RHINOPLASTY", "DENTAL"]);
    }
  });

  it("normalizes legacy service labels", () => {
    const result = createGuestPatientSchema.safeParse({
      ...base,
      requestedServices: ["Rhinoplasty", "Dental", "Hair Transplant"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestedServices).toEqual(["RHINOPLASTY", "DENTAL", "HAIR"]);
    }
  });

  it("rejects unknown services with a clear message", () => {
    const result = createGuestPatientSchema.safeParse({
      ...base,
      requestedServices: ["NOT_A_REAL_SERVICE"],
    });
    expect(result.success).toBe(false);
  });

  it("requires ISO travel dates", () => {
    const result = createGuestPatientSchema.safeParse({
      ...base,
      arrivalDate: "06/01/2026",
      requestedServices: ["EYE"],
    });
    expect(result.success).toBe(false);
  });
});
