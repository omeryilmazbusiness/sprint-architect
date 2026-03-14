import { describe, it, expect, vi } from "vitest";
import { AppError } from "../shared/errors/AppError";
import { ErrorCodes } from "../shared/errors/ErrorCodes";

describe("AppError", () => {
  it("creates an instance with correct properties", () => {
    const err = new AppError(ErrorCodes.SYS_UNEXPECTED, "Something went wrong", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe("SYS-001");
    expect(err.userMessage).toBe("Something went wrong");
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(true);
    expect(err.details).toBeUndefined();
  });

  it("sets isOperational=false from options", () => {
    const err = new AppError(ErrorCodes.EXT_EMAIL_FAILED, "Email down", 503, {
      isOperational: false,
    });
    expect(err.isOperational).toBe(false);
  });

  it("stores details from options", () => {
    const details = { retryAfterMs: 5000 };
    const err = new AppError(ErrorCodes.SYS_UNEXPECTED, "msg", 500, { details });
    expect(err.details).toEqual(details);
  });

  it("message equals userMessage (via super)", () => {
    const err = new AppError(ErrorCodes.NOT_FOUND, "Resource not found", 404);
    expect(err.message).toBe("Resource not found");
  });

  it("has a stack trace", () => {
    const err = new AppError(ErrorCodes.VAL_VALIDATION, "bad input", 400);
    expect(typeof err.stack).toBe("string");
    expect(err.stack).toContain("AppError");
  });
});

describe("ErrorCodes catalog", () => {
  it("all codes are unique strings", () => {
    const values = Object.values(ErrorCodes);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("AUTH codes start with AUTH-", () => {
    expect(ErrorCodes.AUTH_INVALID_CREDENTIALS).toMatch(/^AUTH-/);
    expect(ErrorCodes.AUTH_UNAUTHORIZED).toMatch(/^AUTH-/);
    expect(ErrorCodes.AUTH_FORBIDDEN).toMatch(/^AUTH-/);
    expect(ErrorCodes.AUTH_TOKEN_INVALID).toMatch(/^AUTH-/);
  });

  it("SYS_UNEXPECTED is SYS-001", () => {
    expect(ErrorCodes.SYS_UNEXPECTED).toBe("SYS-001");
  });

  it("EXT codes start with EXT-", () => {
    expect(ErrorCodes.EXT_EMAIL_FAILED).toMatch(/^EXT-/);
    expect(ErrorCodes.EXT_STORAGE_FAILED).toMatch(/^EXT-/);
  });
});

describe("requestIdMiddleware", () => {
  it("attaches a unique requestId to each request", async () => {
    const { requestIdMiddleware } = await import("../shared/middleware/requestId");
    const req1 = { headers: {} } as any;
    const req2 = { headers: {} } as any;
    const res1 = { setHeader: vi.fn() } as any;
    const res2 = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    requestIdMiddleware(req1, res1, next);
    requestIdMiddleware(req2, res2, next);

    expect(req1.requestId).toBeTruthy();
    expect(req2.requestId).toBeTruthy();
    expect(req1.requestId).not.toBe(req2.requestId);
    expect(res1.setHeader).toHaveBeenCalledWith("X-Request-Id", req1.requestId);
    expect(res2.setHeader).toHaveBeenCalledWith("X-Request-Id", req2.requestId);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("reuses existing X-Request-ID header if provided", async () => {
    const { requestIdMiddleware } = await import("../shared/middleware/requestId");
    const existingId = "existing-id-123";
    const req = { headers: { "x-request-id": existingId } } as any;
    const res = { setHeader: vi.fn() } as any;
    const next = vi.fn();

    requestIdMiddleware(req, res, next);
    expect(req.requestId).toBe(existingId);
  });
});
