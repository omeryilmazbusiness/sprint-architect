const primary = "#0A3D62";
const accent = "#00B4D8";
const accentLight = "#90E0EF";

const Colors = {
  light: {
    primary,
    accent,
    accentLight,
    background: "#F0F4F8",
    card: "#FFFFFF",
    text: "#1A1A2E",
    textSecondary: "#6B7C93",
    textMuted: "#A0AEC0",
    border: "#E2E8F0",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    tint: accent,
    tabIconDefault: "#A0AEC0",
    tabIconSelected: accent,
    statusActive: "#10B981",
    statusInactive: "#A0AEC0",
    statusPending: "#F59E0B",
    gradient: [primary, "#1A5276"] as [string, string],
  },
  dark: {
    primary: "#00B4D8",
    accent: "#00B4D8",
    accentLight: "#0A3D62",
    background: "#0D1117",
    card: "#161B22",
    text: "#F0F6FC",
    textSecondary: "#8B949E",
    textMuted: "#484F58",
    border: "#21262D",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    tint: "#00B4D8",
    tabIconDefault: "#484F58",
    tabIconSelected: "#00B4D8",
    statusActive: "#10B981",
    statusInactive: "#484F58",
    statusPending: "#F59E0B",
    gradient: ["#0D1117", "#161B22"] as [string, string],
  },
};

export default Colors;
