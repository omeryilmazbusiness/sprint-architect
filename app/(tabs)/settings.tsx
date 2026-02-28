import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

interface Clinic {
  id: string;
  name: string;
  status: string;
  patientCount: number;
  createdAt: string;
}

function SettingRow({
  icon,
  label,
  value,
  colors,
  accent,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  colors: typeof Colors.light;
  accent?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingRow,
        { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
        last && { borderBottomWidth: 0 },
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: (accent ?? colors.accent) + "15" }]}>
        <Ionicons name={icon} size={18} color={accent ?? colors.accent} />
      </View>
      <Text style={[styles.settingLabel, { color: colors.text, fontFamily: "Inter_500Medium" }]}>
        {label}
      </Text>
      <View style={styles.flex1} />
      {value ? (
        <Text style={[styles.settingValue, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {value}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { data: clinics } = useQuery<Clinic[]>({
    queryKey: ["/api/clinics"],
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function handleLogout() {
    setShowLogoutModal(true);
  }

  async function confirmLogout() {
    setShowLogoutModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace("/(auth)/login");
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  const displayName = user?.email ?? user?.fullName ?? "User";
  const roleLabel =
    user?.role === "ADMIN"
      ? "System Administrator"
      : user?.role === "MANAGER"
      ? "Clinic Manager"
      : "Patient";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Text style={[styles.screenTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          Settings
        </Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.adminCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <View style={[styles.adminAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.adminAvatarText, { fontFamily: "Inter_700Bold" }]}>{initials}</Text>
          </View>
          <View style={styles.flex1}>
            <Text style={[styles.adminName, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              {displayName}
            </Text>
            <Text style={[styles.adminRole, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {roleLabel} · {user?.role}
            </Text>
            {user?.clinicId && (
              <Text style={[styles.adminClinic, { color: colors.accent, fontFamily: "Inter_400Regular" }]}>
                Clinic ID: {user.clinicId}
              </Text>
            )}
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons
              name={
                user?.role === "ADMIN"
                  ? "shield-checkmark"
                  : user?.role === "MANAGER"
                  ? "business"
                  : "person"
              }
              size={16}
              color={colors.accent}
            />
          </View>
        </View>

        {user?.role === "ADMIN" && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              CLINICS
            </Text>
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(clinics ?? []).map((clinic, idx) => (
                <Pressable
                  key={clinic.id}
                  style={({ pressed }) => [
                    styles.clinicRow,
                    { borderBottomColor: colors.border, opacity: pressed ? 0.8 : 1 },
                    idx === (clinics?.length ?? 0) - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[styles.clinicIcon, { backgroundColor: colors.accent + "15" }]}>
                    <Ionicons name="business-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={styles.clinicInfo}>
                    <Text style={[styles.clinicName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                      {clinic.name}
                    </Text>
                    <Text style={[styles.clinicPatients, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                      {clinic.patientCount} patients
                    </Text>
                  </View>
                  <StatusBadge status={clinic.status as any} small />
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          SYSTEM
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {user?.role === "ADMIN" && (
            <SettingRow icon="people-outline" label="User Management" colors={colors} accent={colors.primary} />
          )}
          <SettingRow icon="document-text-outline" label="Invoices" value="Monthly" colors={colors} accent={colors.primary} />
          <SettingRow icon="shield-checkmark-outline" label="Roles & Permissions" value={user?.role} colors={colors} accent={colors.primary} last />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          CONFIGURATION
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="notifications-outline" label="Notifications" colors={colors} accent={colors.warning} />
          <SettingRow icon="language-outline" label="Language" value="English" colors={colors} accent={colors.warning} />
          <SettingRow icon="moon-outline" label="Appearance" value="Auto" colors={colors} accent={colors.warning} last />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
          ABOUT
        </Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingRow icon="information-circle-outline" label="Version" value="1.0.0" colors={colors} accent={colors.textMuted} />
          <SettingRow icon="server-outline" label="API Status" value="Online" colors={colors} accent={colors.success} last />
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            { backgroundColor: colors.error + "10", borderColor: colors.error + "30", opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error, fontFamily: "Inter_600SemiBold" }]}>
            Sign Out
          </Text>
        </Pressable>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Text style={[styles.footerText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            HealthTour Operations Platform
          </Text>
          <Text style={[styles.footerSub, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            Sprint 2 · Auth & RBAC Foundation
          </Text>
        </View>
      </View>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
        testID="logout-modal"
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLogoutModal(false)}
        >
          <View
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: colors.error + "18" }]}>
              <Ionicons name="log-out-outline" size={28} color={colors.error} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
              Sign Out
            </Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowLogoutModal(false)}
                style={[styles.modalBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                testID="logout-cancel"
              >
                <Text style={[styles.modalBtnText, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmLogout}
                style={[styles.modalBtn, styles.modalBtnDestructive, { backgroundColor: colors.error }]}
                testID="logout-confirm"
              >
                <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  Sign Out
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  screenTitle: { fontSize: 28 },
  body: { padding: 20, gap: 10 },
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  adminAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  adminAvatarText: { fontSize: 18, color: "#fff" },
  adminName: { fontSize: 17 },
  adminRole: { fontSize: 12, marginTop: 1 },
  adminClinic: { fontSize: 12, marginTop: 3 },
  roleBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 2,
    marginLeft: 4,
  },
  section: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: { fontSize: 15 },
  settingValue: { fontSize: 14 },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  clinicIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  clinicInfo: { flex: 1 },
  clinicName: { fontSize: 15 },
  clinicPatients: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutText: { fontSize: 15 },
  footer: {
    alignItems: "center",
    gap: 4,
    paddingTop: 16,
    borderTopWidth: 1,
    marginTop: 8,
  },
  footerText: { fontSize: 12 },
  footerSub: { fontSize: 11 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18 },
  modalBody: { fontSize: 14, textAlign: "center" },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  modalBtnDestructive: { borderWidth: 0 },
  modalBtnText: { fontSize: 15 },
});
