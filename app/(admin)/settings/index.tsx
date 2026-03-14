import React, { useState } from "react";
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
import { apiRequest } from "@/lib/query-client";
import {
  fetchSystemStatus,
  fetchJobsStatus,
  fetchEmailStatus,
  fetchSecurityMetrics,
  type SystemStatusResponse,
  type JobsStatusResponse,
  type EmailStatusResponse,
  type SecurityMetricsResponse,
} from "@/lib/api/systemStatus";

const APP_VERSION = "1.0.0";

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

function StatusPillSmall({ status }: { status: "OK" | "DEGRADED" | "DOWN" | "SUCCESS" | "FAILED" | "ENABLED" | "DISABLED" | null }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    OK: { bg: T.success, text: "#fff", label: "OK" },
    SUCCESS: { bg: T.success, text: "#fff", label: "SUCCESS" },
    ENABLED: { bg: T.success, text: "#fff", label: "ENABLED" },
    DEGRADED: { bg: T.warning, text: "#fff", label: "DEGRADED" },
    DOWN: { bg: T.danger, text: "#fff", label: "DOWN" },
    FAILED: { bg: T.danger, text: "#fff", label: "FAILED" },
    DISABLED: { bg: T.textMuted, text: "#fff", label: "DISABLED" },
  };
  const cfg = status ? (map[status] ?? map.DISABLED) : map.DISABLED;
  return (
    <View style={[ps.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[ps.pillText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}
const ps = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pillText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.3 },
});

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

function CardError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <View style={ce.row}>
        <Ionicons name="warning-outline" size={16} color={T.danger} />
        <Text style={ce.text}>Failed to load</Text>
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

function SectionRefreshBtn({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <Pressable onPress={onPress} style={rb.btn} hitSlop={8}>
      {loading ? (
        <ActivityIndicator size={12} color={T.accent} />
      ) : (
        <Ionicons name="refresh-outline" size={13} color={T.accent} />
      )}
      <Text style={rb.label}>{loading ? "Refreshing…" : "Refresh"}</Text>
    </Pressable>
  );
}
const rb = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 4 },
  label: { fontFamily: "Inter_500Medium", fontSize: 12, color: T.accent },
});

function SectionHeaderWithRefresh({ label, onRefresh, loading }: { label: string; onRefresh: () => void; loading: boolean }) {
  return (
    <View style={sh2.row}>
      <Text style={sh2.label}>{label}</Text>
      <SectionRefreshBtn onPress={onRefresh} loading={loading} />
    </View>
  );
}
const sh2 = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 8 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.textMuted, letterSpacing: 0.8 },
});

export default function AdminSettings() {
  const { user, logout } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [showLogoutAll, setShowLogoutAll] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "AD";
  const envLabel = __DEV__ ? "DEV" : "PROD";
  const envColor = __DEV__ ? T.warning : T.success;

  const {
    data: sysStatus,
    isLoading: sysLoading,
    isError: sysError,
    refetch: refetchSys,
    isRefetching: sysRefreshing,
  } = useQuery<SystemStatusResponse>({
    queryKey: ["/v1/admin/system/status"],
    queryFn: fetchSystemStatus,
    staleTime: 30_000,
  });

  const {
    data: jobsData,
    isLoading: jobsLoading,
    isError: jobsError,
    refetch: refetchJobs,
    isRefetching: jobsRefreshing,
  } = useQuery<JobsStatusResponse>({
    queryKey: ["/v1/admin/system/jobs"],
    queryFn: fetchJobsStatus,
    staleTime: 60_000,
  });

  const {
    data: emailData,
    isLoading: emailLoading,
    isError: emailError,
    refetch: refetchEmail,
    isRefetching: emailRefreshing,
  } = useQuery<EmailStatusResponse>({
    queryKey: ["/v1/admin/system/email"],
    queryFn: fetchEmailStatus,
    staleTime: 30_000,
  });

  const {
    data: secData,
    isLoading: secLoading,
    isError: secError,
    refetch: refetchSec,
    isRefetching: secRefreshing,
  } = useQuery<SecurityMetricsResponse>({
    queryKey: ["/v1/admin/system/security-metrics"],
    queryFn: fetchSecurityMetrics,
    staleTime: 60_000,
  });

  const isAnyRefreshing = sysRefreshing || jobsRefreshing || emailRefreshing || secRefreshing;

  function handlePullRefresh() {
    refetchSys();
    refetchJobs();
    refetchEmail();
    refetchSec();
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

  return (
    <View style={s.root}>
      <AdminHeader title="Settings" userEmail={user?.email} onLogout={() => setShowLogout(true)} />

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isAnyRefreshing}
            onRefresh={handlePullRefresh}
            tintColor={T.accent}
          />
        }
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

        {/* ─── System Status ───────────────────────────────────── */}
        <SectionHeaderWithRefresh
          label="SYSTEM STATUS"
          onRefresh={() => refetchSys()}
          loading={sysRefreshing}
        />
        {sysLoading ? (
          <CardSkeleton rows={3} />
        ) : sysError ? (
          <CardError onRetry={() => refetchSys()} />
        ) : (
          <Card noPad>
            <MetricRow
              icon="server-outline"
              iconColor={sysStatus?.api.status === "OK" ? T.success : T.danger}
              label="API"
              sub={sysStatus?.api.latencyMs != null ? `${sysStatus.api.latencyMs} ms` : undefined}
              right={<StatusPillSmall status={sysStatus?.api.status ?? null} />}
            />
            <MetricRow
              icon="layers-outline"
              iconColor={sysStatus?.db.status === "OK" ? T.success : sysStatus?.db.status === "DEGRADED" ? T.warning : T.danger}
              label="Database"
              sub={sysStatus?.db.latencyMs != null ? `${sysStatus.db.latencyMs} ms` : undefined}
              right={<StatusPillSmall status={sysStatus?.db.status ?? null} />}
            />
            <MetricRow
              icon="cloud-upload-outline"
              iconColor={sysStatus?.uploads.status === "ENABLED" ? T.success : T.textMuted}
              label="File Storage"
              right={<StatusPillSmall status={sysStatus?.uploads.status ?? null} />}
              last
            />
          </Card>
        )}

        {/* ─── Scheduler & Billing Jobs ────────────────────────── */}
        <SectionHeaderWithRefresh
          label="SCHEDULER & BILLING JOBS"
          onRefresh={() => refetchJobs()}
          loading={jobsRefreshing}
        />
        {jobsLoading ? (
          <CardSkeleton rows={3} />
        ) : jobsError ? (
          <CardError onRetry={() => refetchJobs()} />
        ) : (
          <Card noPad>
            {(jobsData?.jobs ?? []).map((job, idx) => (
              <View
                key={job.name}
                style={[jb.row, idx === (jobsData?.jobs.length ?? 0) - 1 && { borderBottomWidth: 0 }]}
              >
                <View style={[jb.iconWrap, { backgroundColor: job.lastRunStatus === "FAILED" ? T.danger + "15" : T.accent + "15" }]}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={job.lastRunStatus === "FAILED" ? T.danger : T.accent}
                  />
                </View>
                <View style={jb.info}>
                  <Text style={jb.label}>{job.label}</Text>
                  <Text style={jb.schedule} numberOfLines={1}>{job.schedule}</Text>
                  {job.lastRunAt ? (
                    <Text style={jb.meta}>Last: {timeAgo(job.lastRunAt)}</Text>
                  ) : (
                    <Text style={jb.meta}>Never run</Text>
                  )}
                  {job.lastRunErrorSafe ? (
                    <Text style={jb.error} numberOfLines={2}>{job.lastRunErrorSafe}</Text>
                  ) : null}
                </View>
                <View style={jb.right}>
                  {job.lastRunStatus ? (
                    <StatusPillSmall status={job.lastRunStatus} />
                  ) : (
                    <View style={jb.pendingPill}>
                      <Text style={jb.pendingText}>PENDING</Text>
                    </View>
                  )}
                  <Text style={jb.nextRun}>Next: {formatDate(job.nextRunAt)}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* ─── Email Delivery Status ───────────────────────────── */}
        <SectionHeaderWithRefresh
          label="EMAIL DELIVERY"
          onRefresh={() => refetchEmail()}
          loading={emailRefreshing}
        />
        {emailLoading ? (
          <CardSkeleton rows={3} />
        ) : emailError ? (
          <CardError onRetry={() => refetchEmail()} />
        ) : (
          <Card noPad>
            <MetricRow
              icon="mail-outline"
              iconColor={emailData?.smtpConfigured ? T.success : T.warning}
              label="SMTP"
              sub={emailData?.smtpConfigured ? "External mail server configured" : "Dev console (no real emails sent)"}
              right={
                <View style={[ps.pill, { backgroundColor: emailData?.smtpConfigured ? T.success : T.warning }]}>
                  <Text style={[ps.pillText, { color: "#fff" }]}>{emailData?.smtpConfigured ? "CONFIGURED" : "DEV MODE"}</Text>
                </View>
              }
            />
            <MetricRow
              icon="send-outline"
              iconColor={emailData?.lastEmailStatus === "SUCCESS" ? T.success : emailData?.lastEmailStatus === "FAILED" ? T.danger : T.textMuted}
              label="Last Email"
              sub={emailData?.lastEmailAt ? timeAgo(emailData.lastEmailAt) : "No emails sent yet"}
              right={<StatusPillSmall status={emailData?.lastEmailStatus ?? null} />}
            />
            <MetricRow
              icon="alert-circle-outline"
              iconColor={emailData?.failedLast24h ? T.danger : T.success}
              label="Failed (24h)"
              right={
                <Text style={[em.count, { color: emailData?.failedLast24h ? T.danger : T.success }]}>
                  {emailData?.failedLast24h ?? 0}
                </Text>
              }
              last
            />
          </Card>
        )}

        {/* ─── Security Overview ───────────────────────────────── */}
        <SectionHeaderWithRefresh
          label="SECURITY OVERVIEW"
          onRefresh={() => refetchSec()}
          loading={secRefreshing}
        />
        {secLoading ? (
          <CardSkeleton rows={3} />
        ) : secError ? (
          <CardError onRetry={() => refetchSec()} />
        ) : (
          <Card noPad>
            <MetricRow
              icon="shield-checkmark-outline"
              iconColor={secData?.thisAdmin2faEnabled ? T.success : T.warning}
              label="Two-Factor Auth"
              sub="For this admin account"
              right={
                <View style={[ps.pill, { backgroundColor: secData?.thisAdmin2faEnabled ? T.success : T.warning }]}>
                  <Text style={[ps.pillText, { color: "#fff" }]}>{secData?.thisAdmin2faEnabled ? "ENABLED" : "DISABLED"}</Text>
                </View>
              }
            />
            <MetricRow
              icon="warning-outline"
              iconColor={secData?.failedAdminLoginsLast24h ? T.danger : T.success}
              label="Failed Logins (24h)"
              sub="Admin role login failures"
              right={
                <Text style={[em.count, { color: secData?.failedAdminLoginsLast24h ? T.danger : T.success }]}>
                  {secData?.failedAdminLoginsLast24h ?? 0}
                </Text>
              }
            />
            <MetricRow
              icon="phone-portrait-outline"
              iconColor={T.accent}
              label="Active Sessions"
              sub="Valid refresh tokens for this account"
              right={
                <Text style={[em.count, { color: T.accent }]}>
                  {secData?.thisAdminActiveSessions ?? 0}
                </Text>
              }
              last
            />
          </Card>
        )}

        {/* ─── About ───────────────────────────────────────────── */}
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Version</Text>
          <Text style={s.infoValue}>v{APP_VERSION}</Text>
        </View>

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

const jb = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingVertical: 13, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  iconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  info: { flex: 1 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
  schedule: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.accent, marginTop: 1 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, marginTop: 2 },
  error: { fontFamily: "Inter_400Regular", fontSize: 10, color: T.dangerText, marginTop: 3, backgroundColor: T.dangerBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  right: { alignItems: "flex-end", gap: 5 },
  nextRun: { fontFamily: "Inter_400Regular", fontSize: 10, color: T.textMuted, textAlign: "right" },
  pendingPill: { backgroundColor: T.textMuted + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pendingText: { fontFamily: "Inter_700Bold", fontSize: 10, color: T.textMuted },
});

const em = StyleSheet.create({
  count: { fontFamily: "Inter_700Bold", fontSize: 18 },
});

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

  infoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 16, justifyContent: "space-between" },
  infoLabel: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.textSec },
  infoValue: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },

  brand: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, textAlign: "center", marginTop: 8, marginBottom: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  modal: { backgroundColor: T.surface, borderRadius: 20, padding: 24, width: "85%", alignItems: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 16 },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  modalSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, lineHeight: 20, textAlign: "center" },
  modalBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  modalBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
