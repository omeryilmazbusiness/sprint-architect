import type { EmailProvider, EmailMessage } from "./EmailProvider";
import { CircuitBreaker } from "../shared/circuitBreaker/CircuitBreaker";
import { ErrorCodes } from "../shared/errors/ErrorCodes";

const emailBreaker = new CircuitBreaker({
  failureThreshold: 5,
  cooldownMs: 30_000,
  errorCode: ErrorCodes.EXT_EMAIL_FAILED,
  errorMessage: "Email service is temporarily unavailable. Please try again later.",
});

export class CircuitBreakerEmailProvider implements EmailProvider {
  constructor(private readonly inner: EmailProvider) {}

  async send(message: EmailMessage): Promise<void> {
    await emailBreaker.call(() => this.inner.send(message));
  }

  getState() {
    return emailBreaker.getState();
  }
}
