import { describe, it, expect } from "vitest";
import type { Request } from "express";
import { isReviewClientRequest } from "../reviewMode";

function mockReq(headers: Record<string, string>): Request {
  return { headers } as Request;
}

describe("isReviewClientRequest", () => {
  it("detects review mode header", () => {
    expect(isReviewClientRequest(mockReq({ "x-healory-review-mode": "1" }))).toBe(true);
    expect(isReviewClientRequest(mockReq({ "x-healory-review-mode": "true" }))).toBe(true);
  });

  it("rejects missing header", () => {
    expect(isReviewClientRequest(mockReq({}))).toBe(false);
  });
});
