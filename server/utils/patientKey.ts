import { randomBytes } from "crypto";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const KEY_LENGTH = 8;
export const MAX_KEY_ATTEMPTS = 5;
export const PATIENT_KEY_REGEX = /^PT-[A-Z0-9]{8}$/;

export function generatePatientKey(): string {
  const bytes = randomBytes(KEY_LENGTH);
  let key = "PT-";
  for (let i = 0; i < KEY_LENGTH; i++) {
    key += CHARSET[bytes[i] % CHARSET.length];
  }
  return key;
}
