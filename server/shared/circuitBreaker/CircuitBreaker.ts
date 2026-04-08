import { AppError } from "../errors/AppError";
import type { ErrorCode } from "../errors/ErrorCodes";
import { logger } from "../logger";

type CBState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  errorCode: ErrorCode | string;
  errorMessage: string;
}

export class CircuitBreaker {
  private state: CBState = "CLOSED";
  private failures = 0;
  private openedAt: number | null = null;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly errorCode: ErrorCode | string;
  private readonly errorMessage: string;

  constructor(options: CircuitBreakerOptions) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.errorCode = options.errorCode;
    this.errorMessage = options.errorMessage;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - (this.openedAt ?? 0);
      if (elapsed < this.cooldownMs) {
        throw new AppError(this.errorCode, this.errorMessage, 503, {
          isOperational: true,
          details: {
            circuitBreaker: "OPEN",
            retryAfterMs: this.cooldownMs - elapsed,
          },
        });
      }
      this.state = "HALF_OPEN";
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      if (err instanceof AppError && err.code === this.errorCode) {
        throw err;
      }
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
    this.openedAt = null;
  }

  private onFailure(): void {
    this.failures += 1;
    if (this.state === "HALF_OPEN" || this.failures >= this.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = Date.now();
      logger.warn("[CircuitBreaker] Circuit OPEN", {
        failures: this.failures,
        errorCode: this.errorCode,
        cooldownMs: this.cooldownMs,
      });
    }
  }

  getState(): CBState {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}
