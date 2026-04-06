// ─── Supported locales ────────────────────────────────────────────────────────

export type SupportedLocale = "en" | "ru";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  ru: "Русский",
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
};

// ─── Per-section translation shapes ───────────────────────────────────────────
// Add a new section here when localizing a new page.

export interface AdminDashboardDict {
  pageTitle: string;
  sectionOverview: string;
  sectionQuickActions: string;
  sectionRecentInvoices: string;
  createClinic: string;
  createClinicSub: string;
  allClinics: string;
  allClinicsSub: string;
  allInvoices: string;
  allInvoicesSub: string;
  manageUsers: string;
  manageUsersSub: string;
  loadError: string;
  retry: string;
}

// ─── Root dictionary shape ─────────────────────────────────────────────────────
// Extend with more sections (adminClinics, adminUsers, etc.) as pages are localized.

export interface AppDict {
  adminDashboard: AdminDashboardDict;
}
