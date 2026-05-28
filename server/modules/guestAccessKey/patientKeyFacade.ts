import {
  guestAccessKeyGenerator,
  MAX_KEY_ATTEMPTS,
  GUEST_ACCESS_KEY_REGEX,
  LEGACY_PATIENT_KEY_REGEX,
} from "./GuestAccessKeyGenerator";

export { guestAccessKeyGenerator };

/** Combined pattern for validation hints (legacy + new). */
export const PATIENT_KEY_REGEX = new RegExp(
  `(?:${LEGACY_PATIENT_KEY_REGEX.source})|(?:${GUEST_ACCESS_KEY_REGEX.source})`,
  "i"
);

export { MAX_KEY_ATTEMPTS, LEGACY_PATIENT_KEY_REGEX, GUEST_ACCESS_KEY_REGEX };

export function generatePatientKey(institutionName: string): string {
  return guestAccessKeyGenerator.generate(institutionName);
}
