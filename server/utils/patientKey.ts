/**
 * @deprecated Import from `server/modules/guestAccessKey` — kept for existing imports.
 */
export {
  generatePatientKey,
  MAX_KEY_ATTEMPTS,
  PATIENT_KEY_REGEX,
  LEGACY_PATIENT_KEY_REGEX,
  GUEST_ACCESS_KEY_REGEX,
} from "../modules/guestAccessKey/patientKeyFacade";

export { guestAccessKeyGenerator } from "../modules/guestAccessKey";
