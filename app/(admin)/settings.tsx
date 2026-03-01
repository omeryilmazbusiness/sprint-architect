import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, SectionHeader, ListRow, Divider } from "@/components/ui";
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
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const health = useHealthCheck();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const envLabel = __DEV__ ? "Development" : "Production";
  const envColor = __DEV__ ? T.warning : T.success;
  const healthColor = health === "ok" ? T.success : health === "error" ? T.danger : T.textMuted;
  const healthLabel = health === "checking" ? "Checking…" : health === "ok" ? "Operational" : "Unreachable";
  const healthIcon = health === "ok" ? "checkmark-circle-outline" : health === "error" ? "warning-outline" : "pulse-outline";

  async function handleLogout() {
    setShowLogout(false);
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.root}>
      <AdminHeader title="Settings" userEmail={user?.email} onLogout={() => setShowLogout(true)} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.profileEmail} numberOfLines={1}>{user?.email ?? "Admin"}</Text>
            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: T.primary + "15", borderColor: T.primary + "30" }]}>
                <Text style={[styles.badgeText, { color: T.primary }]}>{user?.role ?? "ADMIN"}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: envColor + "15", borderColor: envColor + "30" }]}>
                <Text style={[styles.badgeText, { color: envColor }]}>{envLabel}</Text>
              </View>
            </View>
          </View>
        </Card>

        <SectionHeader label="Security" style={styles.sectionGap} />
        <Card noPad>
          <ListRow icon="lock-closed-outline" label="Change Password" subtitle="Coming soon" disabled />
          <Divider inset={64} />
          <ListRow icon="log-out-outline" iconColor={T.danger} label="Sign Out" subtitle="Revoke session and return to login" danger onPress={() => setShowLogout(true)} />
        </Card>

        {user?.role === "ADMIN" && (
          <>
            <SectionHeader label="Administration" style={styles.sectionGap} />
            <Card noPad>
              <ListRow icon="business-outline" label="Manage Clinics" subtitle="Create, edit and manage clinics" onPress={() => router.push("/(admin)/clinics")} />
              <Divider inset={64} />
              <ListRow icon="people-outline" label="Manage Users" subtitle="Create managers and manage accounts" onPress={() => router.push("/(admin)/users")} />
              <Divider inset={64} />
              <ListRow icon="document-text-outline" label="Manage Invoices" subtitle="Billing history and invoice generation" onPress={() => router.push("/(admin)/invoices")} />
              <Divider inset={64} />
              <View style={styles.healthRow}>
                <View style={[styles.healthIcon, { backgroundColor: healthColor + "15" }]}>
                  <Ionicons name={healthIcon} size={18} color={healthColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthTitle}>System Health</Text>
                  <View style={styles.healthMeta}>
                    {health === "checking" ? (
                      <ActivityIndicator size="small" color={T.textMuted} style={{ transform: [{ scale: 0.7 }] }} />
                    ) : (
                      <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
                    )}
                    <Text style={[styles.healthStatus, { color: healthColor }]}>{healthLabel}</Text>
                  </View>
                </View>
              </View>
            </Card>
          </>
        )}

        <SectionHeader label="App Info" style={styles.sectionGap} />
        <Card noPad>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <Divider />
          <ListRow icon="shield-checkmark-outline" label="Privacy Policy" subtitle="Coming soon" disabled />
          <Divider inset={64} />
          <ListRow icon="document-outline" label="Terms of Service" subtitle="Coming soon" disabled />
        </Card>

        <Text style={styles.brand}>HealthTour Operations Platform · v{APP_VERSION}</Text>
      </ScrollView>

      <Modal visible={showLogout} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={[styles.modalIcon, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="log-out-outline" size={28} color={T.danger} />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSub}>Your session will be revoked. You'll need to log in again to continue.</Text>
            <View style={styles.modalBtns}>
              <Pressable style={[styles.modalBtn, { borderColor: T.border }]} onPress={() => setShowLogout(false)}>
                <Text style={[styles.modalBtnText, { color: T.textSec }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: T.danger, borderColor: T.danger }]} onPress={handleLogout}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionGap: { marginTop: 20 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 18, color: "#fff" },
  profileEmail: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  badges: { flexDirection: "row", gap: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.4 },
  healthRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  healthIcon: { width: 36, height: 36, borderRadius: T.r10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  healthTitle: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  healthMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  healthDot: { width: 7, height: 7, borderRadius: 3.5 },
  healthStatus: { fontFamily: "Inter_500Medium", fontSize: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, justifyContent: "space-between" },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.textSec },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  brand: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, textAlign: "center", marginTop: 24, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modal: {
    backgroundColor: T.surface,
    borderRadius: T.r20,
    padding: 24,
    width: "85%",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, lineHeight: 20, textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", borderWidth: 1.5 },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
