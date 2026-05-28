import { serializeRequestedServicesForApi } from "@shared/guestRequestedServices";
import type { CreateGuestDict } from "@/i18n/types";
import type { CreateGuestFormErrors, CreateGuestFormState, WizardStep } from "./types";

export function validateCreateGuestStep(
  step: WizardStep,
  form: CreateGuestFormState,
  t: CreateGuestDict,
): CreateGuestFormErrors {
  const errs: CreateGuestFormErrors = {};

  if (step === "guest") {
    if (!form.fullName.trim()) errs.fullName = t.errFullNameRequired;
    if (!form.nationalityCode) errs.nationality = t.errNationalityRequired;
    if (!form.phone.e164) errs.phone = t.errPhoneRequired;
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = t.errInvalidEmail;
    }
  }

  if (step === "services") {
    if (form.requestedServices.length === 0) errs.requestedServices = t.errServicesRequired;
  }

  if (step === "travel") {
    if (!form.arrivalDate) errs.arrivalDate = t.errArrivalRequired;
    if (!form.departureDate) errs.departureDate = t.errDepartureRequired;
    if (form.arrivalDate && form.departureDate && form.departureDate < form.arrivalDate) {
      errs.departureDate = t.errDepartureBefore;
    }
  }

  return errs;
}

export function isStepComplete(step: WizardStep, form: CreateGuestFormState): boolean {
  if (step === "guest") {
    return (
      form.fullName.trim().length > 0 &&
      !!form.nationalityCode &&
      !!form.phone.e164 &&
      (!form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
    );
  }
  if (step === "services") return form.requestedServices.length > 0;
  if (step === "travel") {
    return (
      !!form.arrivalDate &&
      !!form.departureDate &&
      form.departureDate >= form.arrivalDate
    );
  }
  return false;
}

export function buildCreateGuestPayload(form: CreateGuestFormState) {
  return {
    fullName: form.fullName.trim(),
    nationality: form.nationality.trim(),
    nationalityCode: form.nationalityCode.trim().toUpperCase(),
    phoneE164: form.phone.e164!,
    phone: form.phone.e164!,
    email: form.email.trim() || undefined,
    arrivalDate: form.arrivalDate,
    departureDate: form.departureDate,
    requestedServices: serializeRequestedServicesForApi(form.requestedServices),
  };
}
