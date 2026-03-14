import jwt from "jsonwebtoken";

export interface ActorContext {
  sub: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "PATIENT";
  clinicId: string | null;
  patientId?: string;
  type: "user" | "patient";
}

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "ht-access-secret-dev-only";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "ht-refresh-secret-dev-only";

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
