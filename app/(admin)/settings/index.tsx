import React, { useState, useRef } from "react";
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
  Linking,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { T, cardShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, SectionHeader, Divider } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";
import { fetchDiagnostics, type DiagnosticsResult } from "@/lib/api/adminDiagnostics";
import { useT } from "@/hooks/useT";

const APP_VERSION = "1.0.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Small module-level components ────────────────────────────────────────────

function StatusBadge({ ok, labelOk = "OK", labelFail = "FAIL" }: { ok: boolean; labelOk?: string; labelFail?: string }) {
  return (
    <View style={[bd.pill, { backgroundColor: ok ? T.success : T.danger }]}>
      <Text style={bd.text}>{ok ? labelOk : labelFail}</Text>
    </View>
  );
}
const bd = StyleSheet.create({
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  text: { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff", letterSpacing: 0.3 },
});

function EnvBadge({ env }: { env: string }) {
  const isProd = env === "production";
  const color = isProd ? T.success : T.warning;
  return (
    <View style={[bd.pill, { backgroundColor: color }]}>
      <Text style={bd.text}>{isProd ? "PROD" : "DEV"}</Text>
    </View>
  );
}

function MetricRow({
  icon,
  iconColor,
  label,
  right,
  sub,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  right: React.ReactNode;
  sub?: string;
  last?: boolean;
}) {
  return (
    <View style={[mr.row, last && { borderBottomWidth: 0 }]}>
      <View style={[mr.iconWrap, { backgroundColor: iconColor + "15" }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View style={mr.info}>
        <Text style={mr.label}>{label}</Text>
        {sub ? <Text style={mr.sub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}
const mr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  iconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  info: { flex: 1 },
  label: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.text },
  sub: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, marginTop: 1 },
});

function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card noPad>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={sk.row}>
          <View style={sk.icon} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[sk.bar, { width: "55%" }]} />
            <View style={[sk.bar, { width: "35%", opacity: 0.5 }]} />
          </View>
          <View style={sk.pill} />
        </View>
      ))}
    </Card>
  );
}
const sk = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  icon: { width: 34, height: 34, borderRadius: 9, backgroundColor: T.border },
  bar: { height: 10, borderRadius: 5, backgroundColor: T.border },
  pill: { width: 52, height: 22, borderRadius: 6, backgroundColor: T.border },
});

function CardError({ message, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <Card>
      <View style={ce.row}>
        <Ionicons name="warning-outline" size={16} color={T.danger} />
        <Text style={ce.text}>{message ?? "Could not load. Retry."}</Text>
        <Pressable onPress={onRetry} style={ce.btn}>
          <Text style={ce.btnText}>Retry</Text>
        </Pressable>
      </View>
    </Card>
  );
}
const ce = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: T.dangerText },
  btn: { backgroundColor: T.danger, paddingHorizontal: 12, paddingVertical: 6, borderRadius: T.r8 },
  btnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
});

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
        {subtitle ? <Text style={sr.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
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

function SectionRefreshBtn({ onPress, loading, labelRefresh, labelRefreshing }: {
  onPress: () => void; loading: boolean; labelRefresh: string; labelRefreshing: string;
}) {
  return (
    <Pressable onPress={onPress} style={rb.btn} hitSlop={8}>
      {loading ? (
        <ActivityIndicator size={12} color={T.accent} />
      ) : (
        <Ionicons name="refresh-outline" size={13} color={T.accent} />
      )}
      <Text style={rb.label}>{loading ? labelRefreshing : labelRefresh}</Text>
    </Pressable>
  );
}
const rb = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, color: T.accent },
});

function SectionHeaderWithRefresh({
  label, onRefresh, loading, labelRefresh, labelRefreshing,
}: {
  label: string; onRefresh: () => void; loading: boolean; labelRefresh: string; labelRefreshing: string;
}) {
  return (
    <View style={sh2.row}>
      <Text style={sh2.label}>{label}</Text>
      <SectionRefreshBtn onPress={onRefresh} loading={loading} labelRefresh={labelRefresh} labelRefreshing={labelRefreshing} />
    </View>
  );
}
const sh2 = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 8 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.textMuted, letterSpacing: 0.8 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const t = useT();
  const ts = t.adminSettings;
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [showLogoutAll, setShowLogoutAll] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [copiedSupport, setCopiedSupport] = useState(false);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const BILLING_RULES = [
    { icon: "calendar-outline" as const, color: T.accent, label: ts.billingRuleInvoiceCreation, sub: ts.billingRuleInvoiceCreationSub },
    { icon: "time-outline" as const, color: T.warning, label: ts.billingRulePendingToUnpaid, sub: ts.billingRulePendingToUnpaidSub },
    { icon: "close-circle-outline" as const, color: T.danger, label: ts.billingRuleUnpaidToSuspension, sub: ts.billingRuleUnpaidToSuspensionSub },
    { icon: "checkmark-circle-outline" as const, color: T.success, label: ts.billingRulePaidToReactivation, sub: ts.billingRulePaidToReactivationSub },
  ];

  const {
    data: diagData,
    isLoading: diagLoading,
    isError: diagError,
    refetch: refetchDiag,
    isRefetching: diagRefreshing,
  } = useQuery<DiagnosticsResult>({
    queryKey: ["/v1/admin/diagnostics"],
    queryFn: fetchDiagnostics,
    staleTime: 30_000,
  });

  function handlePullRefresh() {
    refetchDiag();
  }

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

  function handleCopyDiagnostics() {
    const payload = {
      timestamp: new Date().toISOString(),
      email: user?.email ?? "unknown",
      version: APP_VERSION,
      diagnostics: diagData ?? null,
    };
    Clipboard?.setString?.(JSON.stringify(payload, null, 2));
    setCopiedDiag(true);
    setTimeout(() => setCopiedDiag(false), 2000);
  }

  function handleCopySupport() {
    const payload = {
      email: user?.email ?? "unknown",
      role: user?.role ?? "unknown",
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      diagnostics: diagData ?? "not loaded",
    };
    Clipboard?.setString?.(JSON.stringify(payload, null, 2));
    setCopiedSupport(true);
    setTimeout(() => setCopiedSupport(false), 2000);
  }

  function handleReportIssue() {
    const subject = encodeURIComponent(
      `Issue Report – HealthTour v${APP_VERSION} [${user?.email ?? "admin"}]`,
    );
    const body = encodeURIComponent(
      `Describe the issue:\n\n\n---\nEmail: ${user?.email ?? "unknown"}\nVersion: ${APP_VERSION}\nTimestamp: ${new Date().toISOString()}\nEnvironment: ${diagData?.env.nodeEnv ?? "unknown"}`,
    );
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  }

  return (
    <View style={s.root}>
      <AdminHeader title={ts.pageTitle} userEmail={user?.email} onLogout={() => setShowLogout(true)} />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={diagRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={T.accent}
          />
        }
      >
        {/* ─── Profile card ──────────────────────────────────────── */}
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
              <View style={[s.badge, {
                backgroundColor: (diagData?.env.nodeEnv === "production" ? T.success : T.warning) + "15",
                borderColor: (diagData?.env.nodeEnv === "production" ? T.success : T.warning) + "30",
              }]}>
                <Text style={[s.badgeText, { color: diagData?.env.nodeEnv === "production" ? T.success : T.warning }]}>
                  {diagData?.env.nodeEnv === "production" ? "PROD" : "DEV"}
                </Text>
              </View>
            </View>
            <View style={s.lastLoginRow}>
              <Ionicons name="time-outline" size={12} color={T.textMuted} />
              <Text style={s.lastLoginText}>
                {user?.lastLoginAt
                  ? `${ts.lastLogin} ${formatDate(user.lastLoginAt)}`
                  : ts.notRecorded}
              </Text>
            </View>
          </View>
        </Card>

        {/* ─── Security ──────────────────────────────────────────── */}
        <SectionHeader label={ts.securitySection} style={s.sectionGap} />
        <Card noPad>
          <SettingsRow
            icon="lock-closed-outline"
            label={ts.changePassword}
            subtitle={ts.changePasswordSub}
            onPress={() => router.push("/(admin)/settings/change-password")}
          />
          <Divider inset={64} />
          <SettingsRow
            icon="phone-portrait-outline"
            iconColor={T.textSec}
            label={ts.twoFactor}
            subtitle={ts.twoFactorSub}
            badge={ts.comingSoon}
            disabled
          />
          <Divider inset={64} />
          <SettingsRow
            icon="wifi-outline"
            iconColor={T.warning}
            label={ts.logoutAllDevices}
            subtitle={ts.logoutAllDevicesSub}
            onPress={() => setShowLogoutAll(true)}
          />
          <Divider inset={64} />
          <SettingsRow
            icon="log-out-outline"
            label={ts.signOut}
            subtitle={ts.signOutSub}
            danger
            onPress={() => setShowLogout(true)}
          />
        </Card>

        {/* ─── Administration ────────────────────────────────────── */}
        {isAdmin && (
          <>
            <SectionHeader label={ts.administrationSection} style={s.sectionGap} />
            <Card noPad>
              <SettingsRow
                icon="business-outline"
                label={ts.manageClinics}
                subtitle={ts.manageClinicsSubtitle}
                onPress={() => router.push("/(admin)/clinics")}
              />
              <Divider inset={64} />
              <SettingsRow
                icon="people-outline"
                label={ts.manageUsers}
                subtitle={ts.manageUsersSub}
                onPress={() => router.push("/(admin)/users")}
              />
              <Divider inset={64} />
              <SettingsRow
                icon="document-text-outline"
                label={ts.manageInvoices}
                subtitle={ts.manageInvoicesSub}
                onPress={() => router.push("/(admin)/invoices")}
              />
            </Card>
          </>
        )}

        {/* ─── Diagnostics ───────────────────────────────────────── */}
        <SectionHeaderWithRefresh
          label={ts.diagnosticsSection}
          onRefresh={() => refetchDiag()}
          loading={diagRefreshing}
          labelRefresh={ts.refresh}
          labelRefreshing={ts.refreshing}
        />
        {diagLoading ? (
          <CardSkeleton rows={4} />
        ) : diagError ? (
          <CardError message={ts.couldNotLoadDiagnostics} onRetry={() => refetchDiag()} />
        ) : (
          <Card noPad>
            <MetricRow
              icon="server-outline"
              iconColor={diagData?.api.ok ? T.success : T.danger}
              label={ts.apiConnectivity}
              sub={`${diagData?.api.latencyMs ?? 0} ms`}
              right={<StatusBadge ok={diagData?.api.ok ?? true} />}
            />
            <MetricRow
              icon="layers-outline"
              iconColor={diagData?.db.ok ? T.success : T.danger}
              label={ts.dbConnectivity}
              sub={`${diagData?.db.latencyMs ?? 0} ms`}
              right={<StatusBadge ok={diagData?.db.ok ?? false} />}
            />
            <MetricRow
              icon="globe-outline"
              iconColor={T.accent}
              label={ts.environment}
              sub={diagData?.env.timezone ?? "—"}
              right={<EnvBadge env={diagData?.env.nodeEnv ?? "development"} />}
            />
            <MetricRow
              icon="code-slash-outline"
              iconColor={T.textMuted}
              label={ts.versionLabel}
              right={<Text style={s.versionText}>v{diagData?.server.version ?? APP_VERSION}</Text>}
              last
            />
            <View style={s.diagActions}>
              <Pressable
                style={({ pressed }) => [s.diagBtn, { opacity: pressed || diagRefreshing ? 0.7 : 1 }]}
                onPress={() => refetchDiag()}
              >
                {diagRefreshing ? (
                  <ActivityIndicator size={12} color={T.accent} />
                ) : (
                  <Ionicons name="refresh-outline" size={14} color={T.accent} />
                )}
                <Text style={s.diagBtnText}>{ts.runDiagnostics}</Text>
              </Pressable>
              <View style={s.diagBtnDivider} />
              <Pressable
                style={({ pressed }) => [s.diagBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={handleCopyDiagnostics}
              >
                <Ionicons
                  name={copiedDiag ? "checkmark-outline" : "copy-outline"}
                  size={14}
                  color={copiedDiag ? T.success : T.accent}
                />
                <Text style={[s.diagBtnText, copiedDiag && { color: T.success }]}>
                  {copiedDiag ? ts.copied : ts.copyDiagnostics}
                </Text>
              </Pressable>
            </View>
          </Card>
        )}

        {/* ─── Billing Policy ────────────────────────────────────── */}
        <SectionHeader label={ts.billingPolicySection} style={s.sectionGap} />
        <Card noPad>
          {BILLING_RULES.map((rule, idx) => (
            <MetricRow
              key={rule.label}
              icon={rule.icon}
              iconColor={rule.color}
              label={rule.label}
              sub={rule.sub}
              right={null}
              last={idx === BILLING_RULES.length - 1}
            />
          ))}
          <Pressable
            style={({ pressed }) => [s.cardActionBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push("/(admin)/invoices")}
          >
            <Ionicons name="receipt-outline" size={15} color={T.accent} />
            <Text style={s.cardActionText}>{ts.openInvoices}</Text>
            <Ionicons name="chevron-forward" size={13} color={T.accent} />
          </Pressable>
        </Card>

        {/* ─── Support ───────────────────────────────────────────── */}
        <SectionHeader label={ts.supportSection} style={s.sectionGap} />
        <Card noPad>
          <SettingsRow
            icon="mail-outline"
            iconColor={T.primary}
            label={ts.reportIssue}
            subtitle={ts.reportIssueSub}
            onPress={handleReportIssue}
          />
          <Divider inset={64} />
          <SettingsRow
            icon={copiedSupport ? "checkmark-circle-outline" : "clipboard-outline"}
            iconColor={copiedSupport ? T.success : T.accent}
            label={copiedSupport ? ts.copied : ts.copySupportCode}
            subtitle={ts.copySupportCodeSub}
            onPress={handleCopySupport}
            rightElement={<View />}
          />
        </Card>

        {/* ─── Data Management ───────────────────────────────────── */}
        <SectionHeader label={ts.dataManagementSection} style={s.sectionGap} />
        <Card noPad>
          <MetricRow
            icon="archive-outline"
            iconColor={T.textMuted}
            label={ts.auditLogRetention}
            sub={ts.auditLogRetentionSub}
            right={null}
          />
          <MetricRow
            icon="document-text-outline"
            iconColor={T.textMuted}
            label={ts.patientRecords}
            sub={ts.patientRecordsSub}
            right={null}
            last
          />
          <Pressable
            style={({ pressed }) => [s.cardActionBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.push("/(admin)/invoices")}
          >
            <Ionicons name="download-outline" size={15} color={T.accent} />
            <Text style={s.cardActionText}>{ts.openExports}</Text>
            <Ionicons name="chevron-forward" size={13} color={T.accent} />
          </Pressable>
        </Card>

        {/* ─── Footer ────────────────────────────────────────────── */}
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>{ts.versionLabel}</Text>
          <Text style={s.infoValue}>v{APP_VERSION}</Text>
        </View>
        <Text style={s.brand}>HealthTour Operations Platform · v{APP_VERSION}</Text>
      </ScrollView>

      {/* ─── Logout Modal ──────────────────────────────────────── */}
      <Modal visible={showLogout} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={[s.modalIcon, { backgroundColor: T.dangerBg }]}>
              <Ionicons name="log-out-outline" size={28} color={T.danger} />
            </View>
            <Text style={s.modalTitle}>{ts.logoutTitle}</Text>
            <Text style={s.modalSub}>{ts.logoutBody}</Text>
            <View style={s.modalBtns}>
              <Pressable style={[s.modalBtn, { borderColor: T.border }]} onPress={() => setShowLogout(false)}>
                <Text style={[s.modalBtnText, { color: T.textSec }]}>{ts.cancel}</Text>
              </Pressable>
              <Pressable style={[s.modalBtn, { backgroundColor: T.danger, borderColor: T.danger }]} onPress={handleLogout}>
                <Text style={[s.modalBtnText, { color: "#fff" }]}>{ts.confirmSignOut}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Logout All Modal ──────────────────────────────────── */}
      <Modal visible={showLogoutAll} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={[s.modalIcon, { backgroundColor: T.warning + "20" }]}>
              <Ionicons name="wifi-outline" size={28} color={T.warning} />
            </View>
            <Text style={s.modalTitle}>{ts.logoutAllTitle}</Text>
            <Text style={s.modalSub}>{ts.logoutAllBody}</Text>
            <View style={s.modalBtns}>
              <Pressable style={[s.modalBtn, { borderColor: T.border }]} onPress={() => setShowLogoutAll(false)} disabled={logoutAllLoading}>
                <Text style={[s.modalBtnText, { color: T.textSec }]}>{ts.cancel}</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtn, { backgroundColor: T.warning, borderColor: T.warning, opacity: logoutAllLoading ? 0.7 : 1 }]}
                onPress={handleLogoutAll}
                disabled={logoutAllLoading}
              >
                {logoutAllLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.modalBtnText, { color: "#fff" }]}>{ts.confirmLogoutAll}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  versionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.text },

  diagActions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
    paddingHorizontal: 4,
  },
  diagBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  diagBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12.5, color: T.accent },
  diagBtnDivider: { width: StyleSheet.hairlineWidth, backgroundColor: T.border, marginVertical: 10 },

  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
  },
  cardActionText: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.accent },

  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 16, justifyContent: "space-between" },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.textSec },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  brand: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, textAlign: "center", marginTop: 8, marginBottom: 8 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modal: {
    backgroundColor: T.surface, borderRadius: 20, padding: 24, width: "85%", alignItems: "center", gap: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
      android: { elevation: 16 },
      web: { boxShadow: "0 8px 24px rgba(0,0,0,0.15)" } as any,
    }),
  },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, lineHeight: 20, textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
