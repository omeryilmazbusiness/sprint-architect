import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  Modal,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/query-client";

const APP_VERSION = "1.0.0";

type HealthStatus = "checking" | "ok" | "error";

function useHealthCheck() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL("/api/health", getApiUrl()).toString();
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!cancelled) setStatus(res.ok ? "ok" : "error");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return status;
}

export default function AdminSettings() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const health = useHealthCheck();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const envLabel = __DEV__ ? "DEV" : "PROD";
  const envColor = __DEV__ ? colors.warning : colors.success;

  async function handleLogout() {
    setShowLogout(false);
    await logout();
    router.replace("/(auth)/login");
  }

  const healthColor =
    health === "ok" ? colors.success : health === "error" ? colors.error : colors.textMuted;
  const healthLabel =
    health === "checking" ? "Checking…" : health === "ok" ? "Operational" : "Unreachable";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={[styles.avatarText, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileEmail, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {user?.email ?? "Admin"}
            </Text>
            <View style={styles.profileBadges}>
              <View style={[styles.roleBadge, { backgroundColor: colors.accent + "20" }]}>
                <Text style={[styles.badgeText, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>
                  {user?.role ?? "ADMIN"}
                </Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: envColor + "20" }]}>
                <Text style={[styles.badgeText, { color: envColor, fontFamily: "Inter_600SemiBold" }]}>
                  {envLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <SectionHeader colors={colors} label="Security" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow
            icon="lock-closed-outline"
            label="Change Password"
            subtitle="Coming soon"
            colors={colors}
            disabled
          />
          <Separator colors={colors} />
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            subtitle="Revoke session and return to login"
            colors={colors}
            accent={colors.error}
            onPress={() => setShowLogout(true)}
          />
        </View>

        {user?.role === "ADMIN" && (
          <>
            <SectionHeader colors={colors} label="Administration" />
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SettingRow
                icon="business-outline"
                label="Manage Clinics"
                subtitle="Create, edit and manage clinics"
                colors={colors}
                onPress={() => router.push("/(admin)/clinics")}
              />
              <Separator colors={colors} />
              <SettingRow
                icon="people-outline"
                label="Manage Users"
                subtitle="Create managers and manage accounts"
                colors={colors}
                onPress={() => router.push("/(admin)/users")}
              />
              <Separator colors={colors} />
              <SettingRow
                icon="document-text-outline"
                label="Manage Invoices"
                subtitle="Billing history and invoice generation"
                colors={colors}
                onPress={() => router.push("/(admin)/invoices")}
              />
              <Separator colors={colors} />
              <View style={styles.healthRow}>
                <View style={[styles.healthIcon, { backgroundColor: healthColor + "18" }]}>
                  <Ionicons
                    name={health === "checking" ? "pulse-outline" : health === "ok" ? "checkmark-circle-outline" : "warning-outline"}
                    size={18}
                    color={healthColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.healthTitle, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
                    System Health
                  </Text>
                  <View style={styles.healthMeta}>
                    {health === "checking" ? (
                      <ActivityIndicator size="small" color={colors.textMuted} style={{ transform: [{ scale: 0.7 }] }} />
                    ) : (
                      <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
                    )}
                    <Text style={[styles.healthStatus, { color: healthColor, fontFamily: "Inter_500Medium" }]}>
                      {healthLabel}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        <SectionHeader colors={colors} label="App Info" />
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Version
            </Text>
            <Text style={[styles.infoValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              {APP_VERSION}
            </Text>
          </View>
          <Separator colors={colors} />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            subtitle="Coming soon"
            colors={colors}
            disabled
          />
          <Separator colors={colors} />
          <SettingRow
            icon="document-outline"
            label="Terms of Service"
            subtitle="Coming soon"
            colors={colors}
            disabled
          />
        </View>

        <Text style={[styles.brand, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
          HealthTour Operations Platform · v{APP_VERSION}
        </Text>
      </ScrollView>

      <Modal visible={showLogout} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={[styles.logoutIcon, { backgroundColor: colors.error + "15" }]}>
              <Ionicons name="log-out-outline" size={28} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              Sign Out
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Your session will be revoked. You'll need to log in again to continue.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => setShowLogout(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.error, borderColor: colors.error }]}
                onPress={handleLogout}
              >
                <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  Sign Out
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({ label, colors }: { label: string; colors: typeof Colors.light }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
      {label.toUpperCase()}
    </Text>
  );
}

function Separator({ colors }: { colors: typeof Colors.light }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

function SettingRow({
  icon,
  label,
  subtitle,
  colors,
  accent,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  colors: typeof Colors.light;
  accent?: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const iconColor = accent ?? colors.accent;
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}
      onPress={disabled ? undefined : onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "18" }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: accent ?? colors.text, fontFamily: "Inter_500Medium" }]}>
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.rowSub, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {!disabled && onPress && (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 0 },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: "#fff", fontSize: 20 },
  profileEmail: { fontSize: 15, marginBottom: 6 },
  profileBadges: { flexDirection: "row", gap: 8 },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 10, letterSpacing: 0.5 },
  sectionHeader: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowLabel: { fontSize: 15 },
  rowSub: { fontSize: 12, marginTop: 1 },
  healthRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  healthIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  healthTitle: { fontSize: 15 },
  healthMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  healthDot: { width: 7, height: 7, borderRadius: 3.5 },
  healthStatus: { fontSize: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    justifyContent: "space-between",
  },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15 },
  brand: { fontSize: 12, textAlign: "center", marginTop: 8, marginBottom: 8 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modal: { borderRadius: 20, padding: 24, width: "85%", alignItems: "center", gap: 12 },
  logoutIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: { fontSize: 20 },
  modalSub: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
