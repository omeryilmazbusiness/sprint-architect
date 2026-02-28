import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type ActorContext } from "./jwt";
import { Errors } from "./errors";

declare global {
  namespace Express {
    interface Request {
      actor?: ActorContext;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    const e = Errors.UNAUTHORIZED();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const token = auth.slice(7);
  try {
    req.actor = verifyAccessToken(token);
    next();
  } catch {
    const e = Errors.TOKEN_INVALID();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
  }
}

export function requireRole(...roles: ActorContext["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.actor) {
      const e = Errors.UNAUTHORIZED();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
    if (!roles.includes(req.actor.role)) {
      const e = Errors.FORBIDDEN(
        `This endpoint requires role: ${roles.join(" or ")}`,
      );
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
    next();
  };
}

export function clinicScopeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.actor) {
    const e = Errors.UNAUTHORIZED();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  if (req.actor.role === "MANAGER" && !req.actor.clinicId) {
    const e = Errors.FORBIDDEN("Manager account has no clinic assigned.");
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  (req as any).clinicId = req.actor.clinicId;
  next();
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const e = err as { code?: string; message?: string; statusCode?: number };
  if (e.code) {
    res.status(e.statusCode ?? 400).json({ code: e.code, message: e.message });
    return;
  }
  console.error("[unhandled]", err);
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Internal server error" });
}
