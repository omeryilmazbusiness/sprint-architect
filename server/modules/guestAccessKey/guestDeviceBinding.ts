export type GuestDeviceBindingDecision =
  | { action: "bind_first_device" }
  | { action: "allow_same_device" }
  | { action: "reject_other_device" };

/**
 * Enforces one active device per guest access key (when multi-device demo is off).
 */
export function resolveGuestDeviceBinding(
  activeDeviceId: string | null | undefined,
  attemptDeviceId: string,
): GuestDeviceBindingDecision {
  if (!activeDeviceId) return { action: "bind_first_device" };
  if (activeDeviceId === attemptDeviceId) return { action: "allow_same_device" };
  return { action: "reject_other_device" };
}
