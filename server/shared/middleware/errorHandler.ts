import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { ErrorCodes } from "../errors/ErrorCodes";
import { logger } from "../logger";

const SYS_USER_MSG =
  "Sistem şu anda bakım sürecindedir. Lütfen daha sonra tekrar deneyin.";

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  const requestId: string = (req as Request & { requestId?: string }).requestId ?? "unknown";
  const actorId: string | undefined = req.actor?.sub;

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

    if (err.isOperational) {
      logger.warn("[AppError] Operational error", logLine);
    } else {
      logger.error("[AppError] Non-operational error", logLine);
    }

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
    logger.warn("[ValidationError] Request validation failed", {
      requestId,
      path: req.path,
      detailCount: details.length,
    });
    res.status(422).json({
      code: ErrorCodes.VAL_VALIDATION,
      message: "Validation failed",
      requestId,
      details,
    });
    return;
  }

  const raw = err as Record<string, unknown>;
  const isPgConstraint =
    raw?.code === "23505" ||
    raw?.code === "23503" ||
    raw?.code === "23514";

  if (isPgConstraint) {
    logger.warn("[DB Constraint] Database constraint violation", {
      requestId,
      pgCode: raw.code,
      detail: typeof raw.detail === "string" ? raw.detail.slice(0, 200) : undefined,
    });
    res.status(409).json({
      code: ErrorCodes.DB_CONSTRAINT,
      message: "A database constraint was violated.",
      requestId,
    });
    return;
  }

  const message = typeof raw?.message === "string" ? raw.message.slice(0, 300) : "Unknown error";
  logger.error("[UnhandledError] Unexpected server error", {
    requestId,
    path: req.path,
    method: req.method,
    actorId,
    message,
    stack: typeof raw?.stack === "string" ? raw.stack.slice(0, 500) : undefined,
  });

  res.status(500).json({
    code: ErrorCodes.SYS_UNEXPECTED,
    message: SYS_USER_MSG,
    requestId,
  });
}
