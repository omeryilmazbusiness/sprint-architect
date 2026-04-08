import jwt from "jsonwebtoken";
import { env } from "../config";

export interface ActorContext {
  sub: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "PATIENT";
  clinicId: string | null;
  patientId?: string;
  type: "user" | "patient";
}

// Secrets are read from config, which validates them at startup and enforces
// that production never runs with the well-known dev defaults.
const ACCESS_SECRET = env.jwtAccessSecret;
const REFRESH_SECRET = env.jwtRefreshSecret;

const ACCESS_TTL = "15m";
const REFRESH_TTL = "30d";

export function signAccessToken(payload: ActorContext): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function signRefreshToken(payload: Pick<ActorContext, "sub" | "type">): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
}

export function verifyAccessToken(token: string): ActorContext {
  return jwt.verify(token, ACCESS_SECRET) as ActorContext;
}

export function verifyRefreshToken(token: string): Pick<ActorContext, "sub" | "type"> {
  return jwt.verify(token, REFRESH_SECRET) as Pick<ActorContext, "sub" | "type">;
}
