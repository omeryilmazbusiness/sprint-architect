import { describe, it, expect } from "vitest";
import { isAppReviewDemoKey } from "../isAppReviewDemoKey";

describe("isAppReviewDemoKey", () => {
  it("recognizes Apple review invite codes", () => {
    expect(isAppReviewDemoKey("PT-4S9WQ2U6")).toBe(true);
    expect(isAppReviewDemoKey("pt-4s9wq2u6")).toBe(true);
    expect(isAppReviewDemoKey("PATIENT-TEST-0001")).toBe(true);
  });

  it("rejects normal keys", () => {
    expect(isAppReviewDemoKey("ABCD-EFGH-1234")).toBe(false);
    expect(isAppReviewDemoKey("")).toBe(false);
  });
});
