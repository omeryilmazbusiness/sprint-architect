import type { GuestRequestedServiceCode } from "@shared/guestRequestedServices";

/**
 * App Store–neutral display labels for requested-service codes (UI only).
 * Internal codes and API legacy labels are unchanged.
 */
export const GUEST_REQUESTED_SERVICE_LABELS_EN: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Service Package A",
  EYE: "Service Package B",
  HAIR: "Service Package C",
  DENTAL: "Service Package D",
  PLASTIC: "Service Package E",
  ORTHOPEDIC: "Service Package F",
  CARDIAC: "Service Package G",
  IVF: "Service Package H",
  BARIATRIC: "Service Package I",
  ONCOLOGY: "Service Package J",
  DERMATOLOGY: "Service Package K",
  ENT: "Service Package L",
  UROLOGY: "Service Package M",
  CHECKUP: "Orientation Session",
  OTHER: "Other",
};

export const GUEST_REQUESTED_SERVICE_LABELS_TR: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Hizmet Paketi A",
  EYE: "Hizmet Paketi B",
  HAIR: "Hizmet Paketi C",
  DENTAL: "Hizmet Paketi D",
  PLASTIC: "Hizmet Paketi E",
  ORTHOPEDIC: "Hizmet Paketi F",
  CARDIAC: "Hizmet Paketi G",
  IVF: "Hizmet Paketi H",
  BARIATRIC: "Hizmet Paketi I",
  ONCOLOGY: "Hizmet Paketi J",
  DERMATOLOGY: "Hizmet Paketi K",
  ENT: "Hizmet Paketi L",
  UROLOGY: "Hizmet Paketi M",
  CHECKUP: "Oryantasyon Oturumu",
  OTHER: "Diğer",
};

export const GUEST_REQUESTED_SERVICE_LABELS_ES: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Paquete de servicio A",
  EYE: "Paquete de servicio B",
  HAIR: "Paquete de servicio C",
  DENTAL: "Paquete de servicio D",
  PLASTIC: "Paquete de servicio E",
  ORTHOPEDIC: "Paquete de servicio F",
  CARDIAC: "Paquete de servicio G",
  IVF: "Paquete de servicio H",
  BARIATRIC: "Paquete de servicio I",
  ONCOLOGY: "Paquete de servicio J",
  DERMATOLOGY: "Paquete de servicio K",
  ENT: "Paquete de servicio L",
  UROLOGY: "Paquete de servicio M",
  CHECKUP: "Sesión de orientación",
  OTHER: "Otro",
};

export const GUEST_REQUESTED_SERVICE_LABELS_RU: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Пакет услуг A",
  EYE: "Пакет услуг B",
  HAIR: "Пакет услуг C",
  DENTAL: "Пакет услуг D",
  PLASTIC: "Пакет услуг E",
  ORTHOPEDIC: "Пакет услуг F",
  CARDIAC: "Пакет услуг G",
  IVF: "Пакет услуг H",
  BARIATRIC: "Пакет услуг I",
  ONCOLOGY: "Пакет услуг J",
  DERMATOLOGY: "Пакет услуг K",
  ENT: "Пакет услуг L",
  UROLOGY: "Пакет услуг M",
  CHECKUP: "Ознакомительная сессия",
  OTHER: "Другое",
};

export function guestRequestedServiceLabel(
  code: string,
  labels: Record<string, string>,
): string {
  return labels[code] ?? GUEST_REQUESTED_SERVICE_LABELS_EN[code as GuestRequestedServiceCode] ?? code;
}
