import type { GuestRequestedServiceCode } from "@shared/guestRequestedServices";

/** English fallback labels (locale bundles override via createGuest.serviceLabels). */
export const GUEST_REQUESTED_SERVICE_LABELS_EN: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Rhinoplasty",
  EYE: "Eye Surgery",
  HAIR: "Hair Transplant",
  DENTAL: "Dental",
  PLASTIC: "Plastic Surgery",
  ORTHOPEDIC: "Orthopedic",
  CARDIAC: "Cardiac",
  IVF: "IVF / Fertility",
  BARIATRIC: "Bariatric / Weight Loss",
  ONCOLOGY: "Oncology",
  DERMATOLOGY: "Dermatology",
  ENT: "ENT",
  UROLOGY: "Urology",
  CHECKUP: "Health Check-up",
  OTHER: "Other",
};

export function guestRequestedServiceLabel(
  code: string,
  labels: Record<string, string>,
): string {
  return labels[code] ?? GUEST_REQUESTED_SERVICE_LABELS_EN[code as GuestRequestedServiceCode] ?? code;
}
