/**
 * Healory Typography System
 *
 * Font: Plus Jakarta Sans — a modern geometric sans-serif with
 * subtle humanist touches. Clean, premium, highly readable.
 * Designed for a modern operations platform.
 *
 * Weights used:
 *   400 Regular  — body text, inputs, captions
 *   500 Medium   — labels, secondary headings, button text
 *   600 SemiBold — section titles, card headings, table headers
 *   700 Bold     — page titles, KPIs, prominent CTAs
 *
 * Usage:
 *   import { Fonts, TS } from "@/constants/typography";
 *   <Text style={TS.pageTitle}>My Title</Text>
 *
 * To change the font family globally, update only the Fonts constants below.
 */

// ─── Font family tokens ────────────────────────────────────────────────────────

export const Fonts = {
  regular:  "PlusJakartaSans_400Regular",
  medium:   "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold:     "PlusJakartaSans_700Bold",
} as const;

// ─── Text style presets ────────────────────────────────────────────────────────
// Each preset contains only font-related properties so it can be spread
// into any StyleSheet alongside layout/color properties.

export const TS = {
  // Hero / display — cinematic welcome screen, app name
  display: {
    fontFamily: Fonts.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },

  // Page-level title — top of each screen
  pageTitle: {
    fontFamily: Fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },

  // Section / card group title
  sectionTitle: {
    fontFamily: Fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
  },

  // Inside cards: main label
  cardHeading: {
    fontFamily: Fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },

  // Table / list row primary text
  rowLabel: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },

  // Standard body text
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },

  // Slightly smaller body for densely packed screens
  bodySmall: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },

  // Form field labels
  fieldLabel: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },

  // Helper / hint text under inputs
  helper: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  // Timestamp, secondary meta info
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 11,
    lineHeight: 15,
  },

  // Status chips, tags, badges
  badge: {
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.4,
  },

  // Button labels
  button: {
    fontFamily: Fonts.semiBold,
    fontSize: 15,
    lineHeight: 20,
  },

  // Small button / link
  buttonSmall: {
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },

  // KPI numbers on dashboards
  kpiValue: {
    fontFamily: Fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  // Table column headers
  tableHeader: {
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.6,
  },

  // Navigation tab labels
  tabLabel: {
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 13,
  },
} as const;
