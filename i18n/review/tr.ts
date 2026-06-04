import type { ReviewOverlay } from "./types";

export const reviewTrOverlay: ReviewOverlay = {
  loginScreen: {
    brandSub: "Topluluk planın, güzelce paylaşılsın.",
    tabGuest: "Üye Girişi",
    tabManagement: "Host Girişi",
    guestKeyLabel: "Davet Kodu",
    guestKeyHelp: "Topluluk host'unuz bu kodu sizinle paylaşır.",
    footer: "Healory · Topluluk ve Etkinlikler",
    errClinicSuspended: "Topluluk erişimi duraklatıldı. Host'unuzla iletişime geçin.",
    errGuestKeyInvalid: "Bu davet kodu geçersiz. Topluluk host'unuzla kontrol edin.",
  },
  managerTabLabels: {
    guests: "Üyeler",
    services: "Deneyim Etiketleri",
  },
  managerUsers: {
    tabGuests: "Üyeler",
    tabDoctors: "Hostlar",
    addDoctor: "Host Ekle",
  },
  managerSettings: {
    clinicSection: "Topluluk",
  },
  guestDashboard: {
    sectionSchedule: "Etkinlikler",
  },
  guestProfile: {
    labelClinic: "Topluluk",
    sectionClinicInfo: "Topluluk Bilgisi",
  },
};
