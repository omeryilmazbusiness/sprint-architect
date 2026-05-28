import { describe, expect, it } from "vitest";
import { enrichResponseWithNeutralAliases } from "../shared/responseAliases";

describe("enrichResponseWithNeutralAliases", () => {
  it("adds neutral keys alongside legacy clinic/patient fields", () => {
    const body = {
      clinicId: "c1",
      clinicName: "Demo",
      patientCount: 3,
      recentInvoices: [{ clinicId: "c1", clinicName: "Demo", patientCount: 1 }],
    };

    const out = enrichResponseWithNeutralAliases(body) as Record<string, unknown> & typeof body;

    expect(out.organizationId).toBe("c1");
    expect(out.organizationName).toBe("Demo");
    expect(out.memberCount).toBe(3);
    const first = out.recentInvoices[0] as Record<string, unknown>;
    expect(first.organizationName).toBe("Demo");
    expect(first.memberCount).toBe(1);
    expect(out.clinicName).toBe("Demo");
  });
});
