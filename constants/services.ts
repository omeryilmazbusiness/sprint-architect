import {
  GUEST_REQUESTED_SERVICES,
  type GuestRequestedServiceCode,
} from "@shared/guestRequestedServices";
import { GUEST_REQUESTED_SERVICE_LABELS_EN } from "./guestRequestedServiceLabels";

/** Clinic institution services (admin clinic create). Aligns with guest intake catalog. */
export const SERVICES = GUEST_REQUESTED_SERVICES.map((s) => ({
  code: s.code,
  label: GUEST_REQUESTED_SERVICE_LABELS_EN[s.code],
})) as ReadonlyArray<{ code: GuestRequestedServiceCode; label: string }>;

export type ServiceCode = GuestRequestedServiceCode;

export function serviceLabel(code: string): string {
  return GUEST_REQUESTED_SERVICE_LABELS_EN[code as GuestRequestedServiceCode] ?? code;
}
