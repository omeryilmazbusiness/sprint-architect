import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { verifyPassword } from "./password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./jwt";
import { authStore } from "./store";
import { Errors } from "./errors";
import { authMiddleware } from "./middleware";

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

  authStore.storeRefreshToken({
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  return { accessToken, refreshToken };
}

router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const e = Errors.VALIDATION_ERROR(parsed.error.issues[0].message);
    res.status(e.statusCode).json({ code: e.code, message: e.message });
    return;
  }

  const { email, password } = parsed.data;
  const user = authStore.findUserByEmail(email);

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

  const { accessToken, refreshToken } = issueTokens(user);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
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

    const stored = authStore.findActiveRefreshToken(refreshToken);
    if (!stored) {
      const e = Errors.TOKEN_INVALID();
      res.status(e.statusCode).json({ code: e.code, message: e.message });
      return;
    }

    authStore.revokeRefreshToken(refreshToken);

    if (payload.type === "user") {
      const user = authStore.findUserById(payload.sub);
      if (!user || user.status !== "ACTIVE") {
        const e = Errors.UNAUTHORIZED();
        res.status(e.statusCode).json({ code: e.code, message: e.message });
        return;
      }

      const tokens = issueTokens(user);
      res.json(tokens);
    } else {
      const patient = authStore.findPatientById(payload.sub);
      if (!patient || patient.status !== "ACTIVE") {
        const e = Errors.UNAUTHORIZED();
        res.status(e.statusCode).json({ code: e.code, message: e.message });
        return;
      }

      const accessToken = signAccessToken({
        sub: patient.id,
        role: "PATIENT",
        clinicId: patient.clinicId,
        patientId: patient.id,
        type: "patient",
      });
      const newRefresh = signRefreshToken({ sub: patient.id, type: "patient" });
      authStore.storeRefreshToken({
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

router.post("/logout", authMiddleware, (req: Request, res: Response): void => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    authStore.revokeRefreshToken(refreshToken);
  }
  if (req.actor?.sub) {
    authStore.revokeAllRefreshTokensForUser(req.actor.sub);
  }
  res.sendStatus(204);
});

export default router;
