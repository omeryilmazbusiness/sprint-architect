import type { ErrorCode } from "./ErrorCodes";

export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor(
    public readonly code: ErrorCode | string,
    public readonly userMessage: string,
    public readonly statusCode: number = 400,
    options?: {
      isOperational?: boolean;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    super(userMessage);
    this.name = "AppError";
    this.isOperational = options?.isOperational ?? true;
    this.details = options?.details;
    this.cause = options?.cause;
  }
}
