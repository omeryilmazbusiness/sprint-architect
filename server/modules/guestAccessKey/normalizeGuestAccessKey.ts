import {
  GUEST_ACCESS_KEY_REGEX,
  LEGACY_HEAL_GUEST_KEY_REGEX,
  LEGACY_HL_GUEST_KEY_REGEX,
  LEGACY_PATIENT_KEY_REGEX,
  LEGACY_SLUG_GUEST_KEY_REGEX,
} from "./GuestAccessKeyGenerator";

/** Trim whitespace; uppercase for XXXX-YYYY-#### keys. Lookup is case-insensitive in DB. */
export function normalizeGuestAccessKey(raw: string): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (GUEST_ACCESS_KEY_REGEX.test(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  return trimmed;
}

export function isRecognizedGuestAccessKeyFormat(key: string): boolean {
  const upper = key.toUpperCase();
  return (
    LEGACY_PATIENT_KEY_REGEX.test(key) ||
    LEGACY_SLUG_GUEST_KEY_REGEX.test(key) ||
    LEGACY_HEAL_GUEST_KEY_REGEX.test(upper) ||
    LEGACY_HL_GUEST_KEY_REGEX.test(upper) ||
    GUEST_ACCESS_KEY_REGEX.test(upper)
  );
}
