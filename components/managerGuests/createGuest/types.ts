import type { GuestRequestedServiceCode } from "@shared/guestRequestedServices";
import type { PhonePickerValue } from "@/components/forms/PhonePickerInput";

export type CreateGuestFormState = {
  fullName: string;
  nationalityCode: string;
  nationality: string;
  nationalityFlag: string;
  phone: PhonePickerValue;
  email: string;
  requestedServices: GuestRequestedServiceCode[];
  arrivalDate: string;
  departureDate: string;
};

export type CreateGuestFormErrors = Partial<Record<keyof CreateGuestFormState, string>>;

export type CreatedGuestResult = {
  id: string;
  patientKey: string;
  fullName: string;
};

export const WIZARD_STEPS = ["guest", "services", "travel"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];
