/**
 * Production user-facing terminology — community & events (not regulated-services framing).
 */
export const DISPLAY_TERMS = {
  clinic: "Community",
  clinics: "Communities",
  patient: "Member",
  patients: "Members",
  doctor: "Host",
  doctors: "Hosts",
  appointment: "Event",
  appointments: "Events",
  guest: "Member",
  guests: "Members",
  manager: "Host",
  treatment: "Experience",
  journey: "Timeline",
  document: "Upload",
  documents: "Uploads",
} as const;

export type DisplayTerms = typeof DISPLAY_TERMS;

export function getDisplayTerms(): DisplayTerms {
  return DISPLAY_TERMS;
}

export const ROLE_LABELS = {
  ADMIN: "Platform Admin",
  MANAGER: "Community Host",
  PATIENT: "Member",
} as const;

export function getRoleLabels() {
  return ROLE_LABELS;
}
