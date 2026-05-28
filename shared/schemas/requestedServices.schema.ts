import { z } from "zod";
import {
  GUEST_REQUESTED_SERVICE_CODES,
  isGuestRequestedServiceCode,
  normalizeRequestedServiceCode,
  type GuestRequestedServiceCode,
} from "../guestRequestedServices";

const serviceCodeTuple = GUEST_REQUESTED_SERVICE_CODES as unknown as [
  GuestRequestedServiceCode,
  ...GuestRequestedServiceCode[],
];

/** Single canonical service code (after normalization). */
export const guestRequestedServiceCodeSchema = z.enum(serviceCodeTuple);

/**
 * Accepts canonical codes (RHINOPLASTY) and legacy labels (Rhinoplasty).
 * Always outputs normalized codes for DB storage.
 */
export const requestedServicesSchema = z
  .array(z.union([z.string(), guestRequestedServiceCodeSchema]))
  .min(1, "Select at least one service")
  .superRefine((items, ctx) => {
    items.forEach((item, index) => {
      const code = normalizeRequestedServiceCode(String(item).trim());
      if (!isGuestRequestedServiceCode(code)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid service: ${item}`,
          path: [index],
        });
      }
    });
  })
  .transform((items): GuestRequestedServiceCode[] => {
    const seen = new Set<GuestRequestedServiceCode>();
    const out: GuestRequestedServiceCode[] = [];
    for (const item of items) {
      const code = normalizeRequestedServiceCode(String(item).trim()) as GuestRequestedServiceCode;
      if (!seen.has(code)) {
        seen.add(code);
        out.push(code);
      }
    }
    return out;
  });
