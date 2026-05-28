import { describe, it, expect } from "vitest";
import { serializeRequestedServicesForApi } from "../guestRequestedServices";

describe("serializeRequestedServicesForApi", () => {
  it("maps codes to legacy API labels for backward compatibility", () => {
    expect(
      serializeRequestedServicesForApi(["RHINOPLASTY", "HAIR", "DENTAL"]),
    ).toEqual(["Rhinoplasty", "Hair Transplant", "Dental"]);
  });
});
