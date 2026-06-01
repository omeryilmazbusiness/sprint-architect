/**
 * User-facing terminology for App Store review builds.
 * Internal API paths and database names are unchanged in this phase.
 */
export const DISPLAY_TERMS = {
  clinic: "Institution",
  clinics: "Institutions",
  patient: "Member",
  patients: "Members",
  doctor: "Provider",
  doctors: "Providers",
  appointment: "Visit",
  appointments: "Visits",
  guest: "Guest",
  guests: "Guests",
  manager: "Staff",
  treatment: "Service",
  journey: "Plan",
  document: "File",
  documents: "Files",
} as const;

/** English role labels for legacy screens without i18n wiring. */
export const ROLE_LABELS = {
  ADMIN: "System Administrator",
  MANAGER: "Institution Staff",
  PATIENT: "Member",
} as const;