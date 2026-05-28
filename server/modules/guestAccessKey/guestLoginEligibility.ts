export type GuestPatientStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "APPROVED"
  | "ENDED"
  | "WAITING_APPROVAL";

/** Statuses that may authenticate with a guest access key. */
export function isGuestLoginAllowed(status: GuestPatientStatus): boolean {
  return status === "ACTIVE" || status === "APPROVED";
}
