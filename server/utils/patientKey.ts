import { randomBytes } from "crypto";

export function generatePatientKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(10);
  let key = "PT-";
  for (let i = 0; i < 8; i++) {
    key += chars[bytes[i] % chars.length];
  }
  return key;
}
