import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker } from "../shared/circuitBreaker/CircuitBreaker";
import { AppError } from "../shared/errors/AppError";

function makeCB(failureThreshold = 3, cooldownMs = 1000) {
  return new CircuitBreaker({
    failureThreshold,
    cooldownMs,
    errorCode: "EXT-EMAIL-001",
    errorMessage: "Email service unavailable",
  });
}

describe("CircuitBreaker — initial state", () => {
  it("starts CLOSED with 0 failures", () => {
    const cb = makeCB();
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getFailures()).toBe(0);
  });
});

describe("CircuitBreaker — success path", () => {
  it("returns the resolved value from fn", async () => {
    const cb = makeCB();
    const result = await cb.call(async () => "ok");
    expect(result).toBe("ok");
  });

  it("stays CLOSED after a successful call", async () => {
    const cb = makeCB();
    await cb.call(async () => 42);
    expect(cb.getState()).toBe("CLOSED");
    expect(cb.getFailures()).toBe(0);
  });

  it("resets failure counter after success", async () => {
    const cb = makeCB(3);
    const fail = async () => { throw new Error("net fail"); };
    const ok = async () => "ok";
    await cb.call(fail).catch(() => {});
    await cb.call(fail).catch(() => {});
    expect(cb.getFailures()).toBe(2);
    await cb.call(ok);
    expect(cb.getFailures()).toBe(0);
    expect(cb.getState()).toBe("CLOSED");
  });
});

describe("CircuitBreaker — failure path", () => {
  it("counts failures on each thrown error", async () => {
    const cb = makeCB(5);
    for (let i = 1; i <= 3; i++) {
      await cb.call(async () => { throw new Error("boom"); }).catch(() => {});
      expect(cb.getFailures()).toBe(i);
    }
    expect(cb.getState()).toBe("CLOSED");
  });

  it("opens the breaker after reaching failureThreshold", async () => {
    const cb = makeCB(3);
    for (let i = 0; i < 3; i++) {
      await cb.call(async () => { throw new Error("boom"); }).catch(() => {});
    }
    expect(cb.getState()).toBe("OPEN");
  });

  it("throws AppError with circuitBreaker=OPEN while OPEN and within cooldown", async () => {
    const cb = makeCB(1, 60_000);
    await cb.call(async () => { throw new Error("net"); }).catch(() => {});
    expect(cb.getState()).toBe("OPEN");

    await expect(cb.call(async () => "should not run")).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppError &&
        (err as AppError).details !== undefined &&
        (err as AppError & { details: { circuitBreaker?: string } }).details.circuitBreaker === "OPEN",
    );
  });
});

describe("CircuitBreaker — HALF_OPEN state", () => {
  it("transitions to HALF_OPEN after cooldown elapses", async () => {
    const cb = makeCB(1, 10);
    await cb.call(async () => { throw new Error("net"); }).catch(() => {});
    await new Promise(r => setTimeout(r, 20));
    expect(cb.getState()).toBe("OPEN");
    const callPromise = cb.call(async () => "probe");
    await callPromise;
    expect(cb.getState()).toBe("CLOSED");
  });

  it("reopens on probe failure in HALF_OPEN", async () => {
    const cb = makeCB(1, 10);
    await cb.call(async () => { throw new Error("net"); }).catch(() => {});
    await new Promise(r => setTimeout(r, 20));
    await cb.call(async () => { throw new Error("still broken"); }).catch(() => {});
    expect(cb.getState()).toBe("OPEN");
  });
});
