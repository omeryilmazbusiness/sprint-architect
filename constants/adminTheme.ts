import { Platform, StyleSheet } from "react-native";

export const T = {
  bg: "#F4F6F9",
  surface: "#FFFFFF",
  surfaceSubtle: "#F8F9FC",
  border: "#E5E9F0",
  borderStrong: "#CDD3DE",

  text: "#111827",
  textSec: "#6B7280",
  textMuted: "#9CA3AF",
  textInverse: "#FFFFFF",

  primary: "#0A3D62",
  accent: "#0369A1",

  success: "#059669",
  successBg: "#ECFDF5",
  successBorder: "#A7F3D0",
  successText: "#065F46",

  warning: "#D97706",
  warningBg: "#FFFBEB",
  warningBorder: "#FDE68A",
  warningText: "#92400E",

  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  dangerBorder: "#FECACA",
  dangerText: "#991B1B",

  inactiveBg: "#F3F4F6",
  inactiveBorder: "#E5E7EB",
  inactiveText: "#6B7280",

  sp4: 4,
  sp8: 8,
  sp12: 12,
  sp16: 16,
  sp20: 20,
  sp24: 24,
  sp32: 32,

  r6: 6,
  r8: 8,
  r10: 10,
  r12: 12,
  r14: 14,
  r16: 16,
  r20: 20,
} as const;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  android: { elevation: 2 },
  default: {},
});

export const softShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 4 },
  default: {},
});

export type AdminTheme = typeof T;
