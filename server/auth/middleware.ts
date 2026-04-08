import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type ActorContext } from "./jwt";
import { Errors } from "./errors";
import { db } from "../db";
import { clinics } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      actor?: ActorContext;
      /** Set by clinicScopeMiddleware — convenience accessor for the clinic-scoped clinic ID. */
      clinicId?: string | null;
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

export async function requireActiveClinic(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.actor) {
    const e = Errors.UNAUTHORIZED();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  if (req.actor.role === "ADMIN") {
    next();
    return;
  }

  const clinicId = req.actor.clinicId;
  if (!clinicId) {
    const e = Errors.FORBIDDEN("No clinic associated with this account.");
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  try {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, clinicId) });
    if (!clinic) {
      const e = Errors.FORBIDDEN("Clinic not found.");
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
    if (clinic.status === "SUSPENDED") {
      const e = Errors.CLINIC_SUSPENDED();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
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

  req.clinicId = req.actor.clinicId;
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
