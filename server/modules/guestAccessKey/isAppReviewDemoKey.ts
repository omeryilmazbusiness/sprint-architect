import { normalizeGuestAccessKey } from "./normalizeGuestAccessKey";

/** Invite codes used for App Store review / smoke tests — any device may log in. */
const APP_REVIEW_DEMO_KEYS = new Set([
  "PT-4S9WQ2U6",
  "PATIENT-TEST-0001",
]);

export function isAppReviewDemoKey(rawKey: string): boolean {
  const normalized = normalizeGuestAccessKey(rawKey);
  if (!normalized) return false;
  return APP_REVIEW_DEMO_KEYS.has(normalized.toUpperCase());
}
