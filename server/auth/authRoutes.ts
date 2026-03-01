import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { verifyPassword } from "./password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./jwt";
import { authRepo } from "../repositories/authRepo";
import { patientRepo } from "../repositories/patientRepo";
import { credentialRequestRepo } from "../repositories/credentialRequestRepo";
import { Errors } from "./errors";
import { authMiddleware } from "./middleware";
import rateLimit from "express-rate-limit";
import { db } from "../db";
import { clinics, users, patients } from "@shared/schema";
import { eq } from "drizzle-orm";
import { runBillingCycle } from "../billing/billingService";
import { auditLog } from "../api/auditLogger";

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const ip = (req.ip ?? "unknown").replace(/^::ffff:/, "");
    const email = (req.body?.email ?? "").toLowerCase();
    return `${ip}:${email}`;
  },
  message: { code: "TOO_MANY_ATTEMPTS", message: "Too many login attempts. Please try again in 10 minutes." },
});

const credentialRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const ip = (req.ip ?? "unknown").replace(/^::ffff:/, "");
    const id = (req.body?.email ?? req.body?.guestAccessKey ?? "").toLowerCase();
    return `cred:${ip}:${id}`;
  },
  message: { code: "TOO_MANY_ATTEMPTS", message: "Too many requests. Please wait 10 minutes before trying again." },
});

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function issueTokens(user: { id: string; role: "ADMIN" | "MANAGER" | "PATIENT"; clinicId: string | null }) {
  const actor = {
    sub: user.id,
    role: user.role,
    clinicId: user.clinicId,
    type: "user" as const,
  };

  const accessToken = signAccessToken(actor);
  const refreshToken = signRefreshToken({ sub: user.id, type: "user" });

  authRepo.storeRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  return { accessToken, refreshToken };
}

router.post("/login", loginLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const e = Errors.VALIDATION_ERROR(parsed.error.issues[0].message);
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = await authRepo.findUserByEmail(email);

  if (!user || user.status !== "ACTIVE") {
    const e = Errors.INVALID_CREDENTIALS();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const e = Errors.INVALID_CREDENTIALS();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  if (user.role !== "ADMIN" && user.clinicId) {
    const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, user.clinicId) });
    if (clinic?.status === "SUSPENDED") {
      const e = Errors.CLINIC_SUSPENDED();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }
  }

  const { accessToken, refreshToken } = issueTokens(user);

  const ip = req.ip ?? req.socket?.remoteAddress;
  authRepo.updateLastLogin(user.id, ip).catch(() => {});
  auditLog({ actorId: user.id, actorRole: user.role, action: "USER_LOGIN_SUCCESS", metadata: { email: user.email, ip } });

  if (user.role === "ADMIN") {
    runBillingCycle().catch((e) => console.error("[billing] login trigger error:", e));
  } else if (user.clinicId) {
    runBillingCycle([user.clinicId]).catch((e) => console.error("[billing] login trigger error:", e));
  }

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      mustChangePassword: (user as any).mustChangePassword ?? false,
      lastLoginAt: (user as any).lastLoginAt?.toISOString() ?? null,
    },
  });
});

router.post("/refresh", async (req: Request, res: Response): Promise<void> => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    const e = Errors.TOKEN_INVALID();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const { refreshToken } = parsed.data;

  try {
    const payload = verifyRefreshToken(refreshToken);

    const stored = await authRepo.findActiveRefreshToken(refreshToken);
    if (!stored) {
      const e = Errors.TOKEN_INVALID();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    await authRepo.revokeRefreshToken(refreshToken);

    if (payload.type === "user") {
      const user = await authRepo.findUserById(payload.sub);
      if (!user || user.status !== "ACTIVE") {
        const e = Errors.UNAUTHORIZED();
        res.status(e.statusCode).json({ code: e.code, message: e.message });
        return;
      }

      if (user.role !== "ADMIN" && user.clinicId) {
        const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, user.clinicId) });
        if (clinic?.status === "SUSPENDED") {
          const e = Errors.CLINIC_SUSPENDED();
          res.status(e.statusCode).json({ code: e.code, message: e.message });
          return;
        }
      }

      const tokens = issueTokens(user);
      res.json(tokens);
    } else {
      const patient = await authRepo.findPatientById(payload.sub);
      if (!patient || patient.status !== "ACTIVE") {
        const e = Errors.UNAUTHORIZED();
        res.status(e.statusCode).json({ code: e.code, message: e.message });
        return;
      }

      if (patient.clinicId) {
        const clinic = await db.query.clinics.findFirst({ where: eq(clinics.id, patient.clinicId) });
        if (clinic?.status === "SUSPENDED") {
          const e = Errors.CLINIC_SUSPENDED();
          res.status(e.statusCode).json({ code: e.code, message: e.message });
          return;
        }
      }

      const accessToken = signAccessToken({
        sub: patient.id,
        role: "PATIENT",
        clinicId: patient.clinicId,
        patientId: patient.id,
        type: "patient",
      });
      const newRefresh = signRefreshToken({ sub: patient.id, type: "patient" });
      await authRepo.storeRefreshToken({
        patientId: patient.id,
        token: newRefresh,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      });
      res.json({ accessToken, refreshToken: newRefresh });
    }
  } catch {
    const e = Errors.TOKEN_INVALID();
    res.status(e.statusCode).json({ code: e.code, message: e.message });
  }
});

router.post("/logout", authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await authRepo.revokeRefreshToken(refreshToken);
  }
  if (req.actor?.sub) {
    if (req.actor.type === "patient") {
      await authRepo.revokeAllRefreshTokensForPatient(req.actor.sub);
    } else {
      await authRepo.revokeAllRefreshTokensForUser(req.actor.sub);
    }
  }
  res.sendStatus(204);
});

// ─── Credential Requests (public, rate-limited) ──────────────────────────────

const CredentialRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("MANAGER_PASSWORD"),
    email: z.string().email(),
  }),
  z.object({
    kind: z.literal("GUEST_ACCESS_KEY"),
    guestAccessKey: z.string().min(1).max(100),
  }),
]);

const GENERIC_SUCCESS = {
  success: true,
  message: "If the account exists, a new credential will be sent once approved.",
};

router.post("/credential-requests", credentialRequestLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = CredentialRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ code: "VALIDATION_ERROR", message: parsed.error.issues[0].message });
    return;
  }

  try {
    if (parsed.data.kind === "MANAGER_PASSWORD") {
      const { email } = parsed.data;
      const user = await authRepo.findUserByEmail(email.toLowerCase());
      if (!user) {
        console.log(`[credential-request] MANAGER_PASSWORD: no user found for email=${email} (silent)`);
      } else if (user.role !== "MANAGER") {
        console.log(`[credential-request] MANAGER_PASSWORD: user role=${user.role} is not MANAGER (silent)`);
      } else if (user.status !== "ACTIVE") {
        console.log(`[credential-request] MANAGER_PASSWORD: user status=${user.status} not ACTIVE (silent)`);
      } else {
        const row = await credentialRequestRepo.create({
          kind: "MANAGER_PASSWORD",
          clinicId: user.clinicId,
          requesterEmail: user.email,
          targetUserId: user.id,
        });
        console.log(`[credential-request] created MANAGER_PASSWORD id=${row.id} targetUserId=${user.id} clinicId=${user.clinicId}`);
        auditLog({
          actorId: user.id,
          actorRole: user.role,
          action: "CREDENTIAL_REQUEST_CREATED",
          resourceType: "user",
          resourceId: user.id,
          metadata: { kind: "MANAGER_PASSWORD" },
        });
      }
    } else {
      const { guestAccessKey } = parsed.data;
      const patient = await patientRepo.findByKey(guestAccessKey.toUpperCase());
      if (!patient) {
        console.log(`[credential-request] GUEST_ACCESS_KEY: no patient found for key=${guestAccessKey.toUpperCase()} (silent)`);
      } else if (patient.status !== "ACTIVE") {
        console.log(`[credential-request] GUEST_ACCESS_KEY: patient status=${patient.status} not ACTIVE (silent)`);
      } else {
        const row = await credentialRequestRepo.create({
          kind: "GUEST_ACCESS_KEY",
          clinicId: patient.clinicId,
          targetPatientId: patient.id,
        });
        console.log(`[credential-request] created GUEST_ACCESS_KEY id=${row.id} targetPatientId=${patient.id} clinicId=${patient.clinicId}`);
        auditLog({
          actorId: patient.id,
          actorRole: "PATIENT",
          action: "CREDENTIAL_REQUEST_CREATED",
          resourceType: "patient",
          resourceId: patient.id,
          metadata: { kind: "GUEST_ACCESS_KEY" },
        });
      }
    }
  } catch (err) {
    console.error("[credential-request] unexpected error:", err);
  }

  res.json(GENERIC_SUCCESS);
});

export default router;
