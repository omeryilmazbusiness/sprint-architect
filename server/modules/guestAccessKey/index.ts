export { slugifyInstitutionName } from "./slugifyInstitutionName";
export {
  deriveInstitutionCode,
  getInstitutionLetterPool,
  pickRandomInstitutionLetters,
} from "./deriveInstitutionCode";
export { generateRandomLetterBlock } from "./generateRandomLetterBlock";
export {
  GuestAccessKeyGenerator,
  guestAccessKeyGenerator,
  GUEST_ACCESS_KEY_PRODUCT_CODE,
  GUEST_ACCESS_KEY_PREFIX,
  GUEST_ACCESS_KEY_REGEX,
  LEGACY_PATIENT_KEY_REGEX,
  LEGACY_SLUG_GUEST_KEY_REGEX,
  LEGACY_HEAL_GUEST_KEY_REGEX,
  LEGACY_HL_GUEST_KEY_REGEX,
  MAX_KEY_ATTEMPTS,
  GUEST_ACCESS_KEY_FORMAT_VERSION,
} from "./GuestAccessKeyGenerator";
export { normalizeGuestAccessKey, isRecognizedGuestAccessKeyFormat } from "./normalizeGuestAccessKey";
export { isGuestLoginAllowed } from "./guestLoginEligibility";
export { resolveGuestDeviceBinding } from "./guestDeviceBinding";
export type { GuestDeviceBindingDecision } from "./guestDeviceBinding";
