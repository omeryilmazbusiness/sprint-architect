/**
 * User-facing terminology for App Store review builds.
 * Internal API paths and database names are unchanged in this phase.
 */
export const DISPLAY_TERMS = {
  clinic: "Institution",
  clinics: "Institutions",
  patient: "Client",
  patients: "Clients",
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