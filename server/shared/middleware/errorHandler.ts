import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/ErrorCodes";

const SYS_USER_MSG =
  "Sistem şu anda bakım sürecindedir. Lütfen daha sonra tekrar deneyin.";

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  const requestId: string = (req as any).requestId ?? "unknown";
  const actorId: string | undefined = (req as any).actor?.sub;

  if (err instanceof AppError) {
    const logLine: Record<string, unknown> = {
      requestId,
      code: err.code,
      status: err.statusCode,
      path: req.path,
      method: req.method,
      message: err.userMessage,
    };
    if (actorId) logLine.actorId = actorId;
    if (!err.isOperational) logLine.stack = err.stack;
    console.error("[AppError]", JSON.stringify(logLine));

    res.status(err.statusCode).json({
      code: err.code,
      message: err.userMessage,
      requestId,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    console.error("[ValidationError]", JSON.stringify({ requestId, path: req.path, details }));
    res.status(422).json({
      code: ErrorCodes.VAL_VALIDATION,
      message: "Validation failed",
      requestId,
      details,
    });
    return;
  }

  const raw = err as any;
  const isPgConstraint =
    raw?.code === "23505" ||
    raw?.code === "23503" ||
    raw?.code === "23514";

  if (isPgConstraint) {
    console.error("[DB Constraint]", JSON.stringify({ requestId, code: raw.code, detail: raw.detail }));
    res.status(409).json({
      code: ErrorCodes.DB_CONSTRAINT,
      message: "A database constraint was violated.",
      requestId,
    });
    return;
  }

  console.error("[UnhandledError]", JSON.stringify({
    requestId,
    path: req.path,
    method: req.method,
    actorId,
    message: raw?.message,
    stack: raw?.stack,
  }));

  res.status(500).json({
    code: ErrorCodes.SYS_UNEXPECTED,
    message: SYS_USER_MSG,
    requestId,
  });
}
