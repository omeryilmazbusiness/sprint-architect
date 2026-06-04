/** Neutral upload presets for community / events apps (App Store safe). */
export const COMMUNITY_UPLOAD_TYPE_PRESETS = [
  { name: "Profile Photo", code: "PROFILE_PHOTO", isRequired: true },
  { name: "Event Photo", code: "EVENT_PHOTO", isRequired: false },
  { name: "Group Snapshot", code: "GROUP_SNAPSHOT", isRequired: false },
  { name: "Host note (private)", code: "HOST_NOTE", isRequired: false },
] as const;

/** Legacy / sensitive codes and names to remove from demo and review. */
export const SENSITIVE_DOCUMENT_TYPE_CODES = new Set([
  "PASSPORT_COPY",
  "VISA",
  "TRAVEL_INSURANCE",
  "CONSENT_FORM",
  "ITINERARY_PDF",
  "TICKET_RESERVATION",
  "INTERNAL_REF",
]);

export const SENSITIVE_DOCUMENT_TYPE_NAMES = new Set([
  "Passport Photocopy",
  "Passport / ID",
  "Visa",
  "Travel Insurance",
  "Consent Form",
  "Medical History",
  "Lab Results (recent)",
  "Internal reference (staff only)",
  "Internal note (staff only)",
  "Travel Itinerary (PDF)",
  "Ticket / Reservation",
]);

export function isSensitiveDocumentType(name: string, code?: string | null): boolean {
  if (code && SENSITIVE_DOCUMENT_TYPE_CODES.has(code)) return true;
  return SENSITIVE_DOCUMENT_TYPE_NAMES.has(name);
}
