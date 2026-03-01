import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { T, cardShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, SectionHeader, Divider } from "@/components/ui";
import { apiRequest, getApiUrl } from "@/lib/query-client";

const APP_VERSION = "1.0.0";

type HealthStatus = "checking" | "ok" | "error";

function useHealthCheck() {
  const [status, setStatus] = useState<HealthStatus>("checking");
  const check = () => {
    setStatus("checking");
    const url = new URL("/api/health", getApiUrl()).toString();
    fetch(url, { signal: AbortSignal.timeout(5000) })
      .then((res) => setStatus(res.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  };
  useEffect(check, []);
  return { status, recheck: check };
}

interface AuditEntry {
  id: string;
  action: string;
  actorId: string;
  actorRole: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "Never";
  try {
    return new Date(isoDate).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "Unknown";
  }
}

function actionColor(action: string): string {
  if (action.includes("FAIL") || action.includes("SUSPEND")) return T.danger;
  if (action.includes("LOGIN")) return T.accent;
  if (action.includes("PASSWORD") || action.includes("LOGOUT")) return T.warning;
  if (action.includes("PAID") || action.includes("APPROV")) return T.success;
  return T.textSec;
}

function actionIcon(action: string): string {
  if (action.includes("LOGIN")) return "log-in-outline";
  if (action.includes("LOGOUT")) return "log-out-outline";
  if (action.includes("PASSWORD")) return "key-outline";
  if (action.includes("INVOICE")) return "document-text-outline";
  if (action.includes("CLINIC")) return "business-outline";
  if (action.includes("USER") || action.includes("PATIENT")) return "person-outline";
  return "ellipse-outline";
}

function SettingsRow({
  icon,
  iconColor,
  label,
  subtitle,
  onPress,
  danger,
  disabled,
  badge,
  rightElement,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
  badge?: string;
  rightElement?: React.ReactNode;
}) {
  const ic = iconColor ?? (danger ? T.danger : T.primary);
  return (
    <Pressable
      style={({ pressed }) => [
        sr.row,
        pressed && !disabled && { backgroundColor: T.surfaceSubtle },
        disabled && { opacity: 0.5 },
      ]}
      onPress={disabled ? undefined : onPress}
    >
      <View style={[sr.iconWrap, { backgroundColor: ic + "12" }]}>
        <Ionicons name={icon as any} size={18} color={ic} />
      </View>
      <View style={sr.info}>
        <Text style={[sr.label, danger && { color: T.danger }]}>{label}</Text>
        {subtitle ? <Text style={sr.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[sr.badge, { backgroundColor: T.warning + "15", borderColor: T.warning + "40" }]}>
          <Text style={[sr.badgeText, { color: T.warning }]}>{badge}</Text>
        </View>
      ) : rightElement ?? (
        !disabled && <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
      )}
    </Pressable>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  info: { flex: 1 },
  label: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.3 },
});

export default function AdminSettings() {
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [showLogoutAll, setShowLogoutAll] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const { status: health, recheck } = useHealthCheck();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const envLabel = __DEV__ ? "DEV" : "PROD";
  const envColor = __DEV__ ? T.warning : T.success;
  const healthColor = health === "ok" ? T.success : health === "error" ? T.danger : T.textMuted;
  const healthLabel = health === "checking" ? "Checking…" : health === "ok" ? "Operational" : "Unreachable";

  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit, isRefetching: auditRefreshing } = useQuery<AuditEntry[]>({
    queryKey: ["/v1/admin/audit-logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/v1/admin/audit-logs?limit=10");
      return res.json();
    },
    staleTime: 30_000,
  });

  async function handleLogout() {
    setShowLogout(false);
    await logout();
    router.replace("/(auth)/login");
  }

  async function handleLogoutAll() {
    setLogoutAllLoading(true);
    try {
      await apiRequest("POST", "/v1/admin/auth/logout-all", {});
    } catch {}
    setLogoutAllLoading(false);
    setShowLogoutAll(false);
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={s.root}>
      <AdminHeader title="Settings" userEmail={user?.email} onLogout={() => setShowLogout(true)} />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={auditRefreshing} onRefresh={() => { refetchAudit(); recheck(); }} tintColor={T.accent} />}
      >
        {/* ─── Profile ─────────────────────────────────────────── */}
        <Card style={s.profileCard}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <Text style={s.profileEmail} numberOfLines={1}>{user?.email ?? "Admin"}</Text>
            <View style={s.profileBadges}>
              <View style={[s.badge, { backgroundColor: T.primary + "15", borderColor: T.primary + "30" }]}>
                <Ionicons name="shield-outline" size={10} color={T.primary} />
                <Text style={[s.badgeText, { color: T.primary }]}>{user?.role ?? "ADMIN"}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: envColor + "15", borderColor: envColor + "30" }]}>
                <Text style={[s.badgeText, { color: envColor }]}>{envLabel}</Text>
              </View>
            </View>
            <View style={s.lastLoginRow}>
              <Ionicons name="time-outline" size={12} color={T.textMuted} />
              <Text style={s.lastLoginText}>
                {user?.lastLoginAt ? `Last login: ${formatDate(user.lastLoginAt)}` : "Last login: not recorded"}
              </Text>
            </View>
          </View>
        </Card>

        {/* ─── Security ────────────────────────────────────────── */}
        <SectionHeader label="Security" style={s.sectionGap} />
        <Card noPad>
          <SettingsRow
            icon="lock-closed-outline"
            label="Change Password"
            subtitle="Update credentials with policy enforcement"
            onPress={() => router.push("/(admin)/settings/change-password")}
          />
          <Divider inset={64} />
          <SettingsRow
            icon="phone-portrait-outline"
            iconColor={T.textSec}
            label="Two-Factor Authentication"
            subtitle="Enhanced login security"
            badge="Soon"
            disabled
          />
          <Divider inset={64} />
          <SettingsRow
            icon="wifi-outline"
            iconColor={T.warning}
            label="Logout All Devices"
            subtitle="Revoke all active sessions across every device"
            onPress={() => setShowLogoutAll(true)}
          />
          <Divider inset={64} />
          <SettingsRow
            icon="log-out-outline"
            label="Sign Out"
            subtitle="Revoke current session"
            danger
            onPress={() => setShowLogout(true)}
          />
        </Card>

        {/* ─── Administration ──────────────────────────────────── */}
        {user?.role === "ADMIN" && (
          <>
            <SectionHeader label="Administration" style={s.sectionGap} />
            <Card noPad>
              <SettingsRow
                icon="business-outline"
                label="Manage Clinics"
                subtitle="Create, edit and suspend clinics"
                onPress={() => router.push("/(admin)/clinics")}
              />
              <Divider inset={64} />
              <SettingsRow
                icon="people-outline"
                label="Manage Users & Patients"
                subtitle="Staff accounts and patient records"
                onPress={() => router.push("/(admin)/users")}
              />
              <Divider inset={64} />
              <SettingsRow
                icon="document-text-outline"
                label="Manage Invoices"
                subtitle="Billing history and payment status"
                onPress={() => router.push("/(admin)/invoices")}
              />
            </Card>
          </>
        )}

        {/* ─── System ──────────────────────────────────────────── */}
        <SectionHeader label="System" style={s.sectionGap} />
        <Card noPad>
          <Pressable style={s.healthRow} onPress={recheck}>
            <View style={[s.healthIcon, { backgroundColor: healthColor + "15" }]}>
              {health === "checking" ? (
                <ActivityIndicator size="small" color={healthColor} />
              ) : (
                <Ionicons name={health === "ok" ? "checkmark-circle-outline" : "warning-outline"} size={18} color={healthColor} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.healthTitle}>API Health</Text>
              <View style={s.healthMeta}>
                <View style={[s.healthDot, { backgroundColor: healthColor }]} />
                <Text style={[s.healthStatus, { color: healthColor }]}>{healthLabel}</Text>
              </View>
            </View>
            <Ionicons name="refresh-outline" size={14} color={T.textMuted} />
          </Pressable>
          <Divider inset={64} />
          <View style={s.healthRow}>
            <View style={[s.healthIcon, { backgroundColor: T.accent + "15" }]}>
              <Ionicons name="calendar-outline" size={18} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.healthTitle}>Billing Scheduler</Text>
              <Text style={s.healthStatus2}>Auto-generates invoices on last day of month</Text>
            </View>
            <View style={[s.activePill]}>
              <View style={[s.activeDot, { backgroundColor: T.success }]} />
              <Text style={[s.activeText, { color: T.success }]}>Active</Text>
            </View>
          </View>
          <Divider inset={64} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Version</Text>
            <Text style={s.infoValue}>v{APP_VERSION}</Text>
          </View>
        </Card>

        {/* ─── Audit Log ───────────────────────────────────────── */}
        <SectionHeader label="Recent Activity" style={s.sectionGap} />
        <Card noPad>
          {auditLoading ? (
            <View style={s.auditLoading}>
              <ActivityIndicator color={T.accent} size="small" />
              <Text style={s.auditLoadingText}>Loading activity…</Text>
            </View>
          ) : !auditData || auditData.length === 0 ? (
            <View style={s.auditEmpty}>
              <Ionicons name="time-outline" size={28} color={T.textMuted} />
              <Text style={s.auditEmptyText}>No activity recorded yet</Text>
            </View>
          ) : (
            auditData.map((entry, idx) => {
              const c = actionColor(entry.action);
              const icon = actionIcon(entry.action);
              return (
                <React.Fragment key={entry.id}>
                  <View style={s.auditRow}>
                    <View style={[s.auditIconWrap, { backgroundColor: c + "12" }]}>
                      <Ionicons name={icon as any} size={14} color={c} />
                    </View>
                    <View style={s.auditInfo}>
                      <Text style={s.auditAction} numberOfLines={1}>{entry.action.replace(/_/g, " ")}</Text>
                      <Text style={s.auditMeta} numberOfLines={1}>
                        {entry.actorRole} · {timeAgo(entry.createdAt)}
                        {entry.metadata?.email ? ` · ${entry.metadata.email}` : ""}
                      </Text>
                    </View>
                    <Text style={[s.auditTag, { color: c, backgroundColor: c + "10" }]}>{entry.actorRole}</Text>
                  </View>
                  {idx < auditData.length - 1 && <Divider inset={60} />}
                </React.Fragment>
              );
            })
          )}
        </Card>

        <Text style={s.brand}>HealthTour Operations Platform · v{APP_VERSION}</Text>
      </ScrollView>

      {/* ─── Logout Modal ────────────────────────────────────── */}
      <Modal visible={showLogout} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={[s.modalIcon, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="log-out-outline" size={28} color={T.danger} />
            </View>
            <Text style={s.modalTitle}>Sign Out</Text>
            <Text style={s.modalSub}>Your current session will be revoked. You'll need to log in again.</Text>
            <View style={s.modalBtns}>
              <Pressable style={[s.modalBtn, { borderColor: T.border }]} onPress={() => setShowLogout(false)}>
                <Text style={[s.modalBtnText, { color: T.textSec }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.modalBtn, { backgroundColor: T.danger, borderColor: T.danger }]} onPress={handleLogout}>
                <Text style={[s.modalBtnText, { color: "#fff" }]}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Logout All Modal ────────────────────────────────── */}
      <Modal visible={showLogoutAll} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={[s.modalIcon, { backgroundColor: T.warning + "20" }]}>
              <Ionicons name="wifi-outline" size={28} color={T.warning} />
            </View>
            <Text style={s.modalTitle}>Logout All Devices</Text>
            <Text style={s.modalSub}>
              This will immediately revoke all active sessions across every device, including this one. You will be redirected to the login screen.
            </Text>
            <View style={s.modalBtns}>
              <Pressable style={[s.modalBtn, { borderColor: T.border }]} onPress={() => setShowLogoutAll(false)} disabled={logoutAllLoading}>
                <Text style={[s.modalBtnText, { color: T.textSec }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtn, { backgroundColor: T.warning, borderColor: T.warning, opacity: logoutAllLoading ? 0.7 : 1 }]}
                onPress={handleLogoutAll}
                disabled={logoutAllLoading}
              >
                {logoutAllLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalBtnText, { color: "#fff" }]}>Logout All</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 0 },
  sectionGap: { marginTop: 20 },

  profileCard: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 20 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: T.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 20, color: "#fff" },
  profileEmail: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  profileBadges: { flexDirection: "row", gap: 6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.4 },
  lastLoginRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  lastLoginText: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted },

  healthRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  healthIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  healthTitle: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  healthMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  healthDot: { width: 7, height: 7, borderRadius: 3.5 },
  healthStatus: { fontFamily: "Inter_500Medium", fontSize: 12 },
  healthStatus2: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 2 },
  activePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: T.success + "12", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, justifyContent: "space-between" },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.textSec },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },

  auditLoading: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16 },
  auditLoadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted },
  auditEmpty: { alignItems: "center", gap: 8, padding: 24 },
  auditEmptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted },
  auditRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  auditIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  auditInfo: { flex: 1 },
  auditAction: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.text },
  auditMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, marginTop: 2 },
  auditTag: { fontFamily: "Inter_600SemiBold", fontSize: 9, letterSpacing: 0.3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },

  brand: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, textAlign: "center", marginTop: 28, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modal: { backgroundColor: T.surface, borderRadius: 20, padding: 24, width: "85%", alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, lineHeight: 20, textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
