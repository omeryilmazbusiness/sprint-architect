/**
 * Canonical requested-service codes for guest intake (manager create guest).
 * Stored in DB as JSON array of these codes.
 */
export const GUEST_REQUESTED_SERVICE_CODES = [
  "RHINOPLASTY",
  "EYE",
  "HAIR",
  "DENTAL",
  "PLASTIC",
  "ORTHOPEDIC",
  "CARDIAC",
  "IVF",
  "BARIATRIC",
  "ONCOLOGY",
  "DERMATOLOGY",
  "ENT",
  "UROLOGY",
  "CHECKUP",
  "OTHER",
] as const;

export type GuestRequestedServiceCode = (typeof GUEST_REQUESTED_SERVICE_CODES)[number];

export type GuestRequestedServiceMeta = {
  code: GuestRequestedServiceCode;
  icon: string;
  /** i18n key segment — label resolved via createGuest.serviceLabels[code] */
};

export const GUEST_REQUESTED_SERVICES: readonly GuestRequestedServiceMeta[] = [
  { code: "RHINOPLASTY", icon: "cube-outline" },
  { code: "EYE", icon: "scan-outline" },
  { code: "HAIR", icon: "cut-outline" },
  { code: "DENTAL", icon: "grid-outline" },
  { code: "PLASTIC", icon: "sparkles-outline" },
  { code: "ORTHOPEDIC", icon: "walk-outline" },
  { code: "CARDIAC", icon: "pulse-outline" },
  { code: "IVF", icon: "leaf-outline" },
  { code: "BARIATRIC", icon: "scale-outline" },
  { code: "ONCOLOGY", icon: "layers-outline" },
  { code: "DERMATOLOGY", icon: "water-outline" },
  { code: "ENT", icon: "radio-outline" },
  { code: "UROLOGY", icon: "funnel-outline" },
  { code: "CHECKUP", icon: "clipboard-outline" },
  { code: "OTHER", icon: "ellipsis-horizontal-outline" },
] as const;

/** Legacy English labels persisted before code migration. */
export const LEGACY_REQUESTED_SERVICE_CODES: Record<string, GuestRequestedServiceCode> = {
  Rhinoplasty: "RHINOPLASTY",
  "Eye Surgery": "EYE",
  "Hair Transplant": "HAIR",
  Dental: "DENTAL",
  "Plastic Surgery": "PLASTIC",
  Orthopedic: "ORTHOPEDIC",
  Cardiac: "CARDIAC",
  "IVF / Fertility": "IVF",
  "Weight Loss Surgery": "BARIATRIC",
  Oncology: "ONCOLOGY",
  Dermatology: "DERMATOLOGY",
  ENT: "ENT",
  Urology: "UROLOGY",
  "Health Check-up": "CHECKUP",
  Other: "OTHER",
};

export function normalizeRequestedServiceCode(raw: string): string {
  return LEGACY_REQUESTED_SERVICE_CODES[raw] ?? raw;
}

/**
 * Legacy API labels (pre–service-code migration).
 * Used when talking to servers that still validate z.enum(["Rhinoplasty", …]).
 * New servers accept both via `requestedServicesSchema` and store canonical codes.
 */
export const LEGACY_API_SERVICE_LABEL_BY_CODE: Record<
  GuestRequestedServiceCode,
  string
> = {
  RHINOPLASTY: "Rhinoplasty",
  EYE: "Eye Surgery",
  HAIR: "Hair Transplant",
  DENTAL: "Dental",
  PLASTIC: "Plastic Surgery",
  ORTHOPEDIC: "Orthopedic",
  CARDIAC: "Cardiac",
  IVF: "IVF / Fertility",
  BARIATRIC: "Weight Loss Surgery",
  ONCOLOGY: "Oncology",
  DERMATOLOGY: "Dermatology",
  ENT: "ENT",
  UROLOGY: "Urology",
  CHECKUP: "Health Check-up",
  OTHER: "Other",
};

/** Serialize for POST /v1/manager/patients (compatible with old + new API). */
export function serializeRequestedServicesForApi(
  codes: readonly GuestRequestedServiceCode[],
): string[] {
  return codes.map((code) => LEGACY_API_SERVICE_LABEL_BY_CODE[code] ?? code);
}

export function isGuestRequestedServiceCode(
  value: string,
): value is GuestRequestedServiceCode {
  return (GUEST_REQUESTED_SERVICE_CODES as readonly string[]).includes(value);
}
