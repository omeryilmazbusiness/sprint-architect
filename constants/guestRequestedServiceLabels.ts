import type { GuestRequestedServiceCode } from "@shared/guestRequestedServices";

/** Community / events display labels (App Store safe). */
export const GUEST_REQUESTED_SERVICE_LABELS_EN: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "City Meetup",
  EYE: "Photo Walk",
  HAIR: "Workshop",
  DENTAL: "Game Night",
  PLASTIC: "Outdoor Hangout",
  ORTHOPEDIC: "Team Activity",
  CARDIAC: "Live Session",
  IVF: "Group Challenge",
  BARIATRIC: "Wellness Hour",
  ONCOLOGY: "Creative Lab",
  DERMATOLOGY: "Art & Craft",
  ENT: "Music Jam",
  UROLOGY: "Food Tour",
  CHECKUP: "Welcome Circle",
  OTHER: "Other",
};

export const GUEST_REQUESTED_SERVICE_LABELS_TR: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Şehir Buluşması",
  EYE: "Fotoğraf Yürüyüşü",
  HAIR: "Atölye",
  DENTAL: "Oyun Gecesi",
  PLASTIC: "Açık Hava",
  ORTHOPEDIC: "Takım Etkinliği",
  CARDIAC: "Canlı Oturum",
  IVF: "Grup Mücadelesi",
  BARIATRIC: "Wellness Saati",
  ONCOLOGY: "Yaratıcı Lab",
  DERMATOLOGY: "Sanat Atölyesi",
  ENT: "Müzik Jam",
  UROLOGY: "Lezzet Turu",
  CHECKUP: "Karşılama Çemberi",
  OTHER: "Diğer",
};

export const GUEST_REQUESTED_SERVICE_LABELS_ES: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Encuentro urbano",
  EYE: "Paseo fotográfico",
  HAIR: "Taller",
  DENTAL: "Noche de juegos",
  PLASTIC: "Hangout al aire libre",
  ORTHOPEDIC: "Actividad en equipo",
  CARDIAC: "Sesión en vivo",
  IVF: "Reto grupal",
  BARIATRIC: "Hora wellness",
  ONCOLOGY: "Laboratorio creativo",
  DERMATOLOGY: "Arte y manualidades",
  ENT: "Jam musical",
  UROLOGY: "Tour gastronómico",
  CHECKUP: "Círculo de bienvenida",
  OTHER: "Otro",
};

export const GUEST_REQUESTED_SERVICE_LABELS_RU: Record<GuestRequestedServiceCode, string> = {
  RHINOPLASTY: "Городская встреча",
  EYE: "Фото-прогулка",
  HAIR: "Мастер-класс",
  DENTAL: "Игровой вечер",
  PLASTIC: "Отдых на природе",
  ORTHOPEDIC: "Командное занятие",
  CARDIAC: "Живая сессия",
  IVF: "Групповой челлендж",
  BARIATRIC: "Wellness-час",
  ONCOLOGY: "Творческая лаборатория",
  DERMATOLOGY: "Творчество",
  ENT: "Музыкальный джем",
  UROLOGY: "Гастротур",
  CHECKUP: "Круг приветствия",
  OTHER: "Другое",
};

export function guestRequestedServiceLabel(
  code: string,
  labels: Record<string, string>,
): string {
  return labels[code] ?? GUEST_REQUESTED_SERVICE_LABELS_EN[code as GuestRequestedServiceCode] ?? code;
}
