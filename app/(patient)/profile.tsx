import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useTabBarMetrics } from "@/components/layout/TabBarMetricsContext";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestProfile } from "@/hooks/guest/useGuestProfile";
import { T, cardShadow } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/query-client";
import { copyToClipboard } from "@/lib/clipboard";
import { frameDisplayText } from "@/lib/frameDisplayText";

// ─── Country flag helper ────────────────────────────────────────────────────────

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const base = 0x1f1e6 - 65;
  const chars = code
    .toUpperCase()
    .split("")
    .map((c) => base + c.charCodeAt(0));
  try {
    return String.fromCodePoint(...chars) + " ";
  } catch {
    return "";
  }
}

// ─── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.sectionHeader}>{label}</Text>;
}

// ─── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
  onPress?: () => void;
}) {
  if (!value) return null;
  return (
    <Pressable style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon as any} size={16} color={T.accent} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text
          style={[styles.infoValue, onPress ? { color: T.accent } : null]}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
      ) : null}
    </Pressable>
  );
}

// ─── Row divider ───────────────────────────────────────────────────────────────

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { bottomPadding: tabBarHeight } = useTabBarMetrics();
  // Extra space so sign-out stays above the floating tab bar on long profiles.
  const scrollBottomPadding = tabBarHeight + 48;
  const { isLoading, isError, refetch, patient, manager } = useGuestProfile();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = useT();
  const tp = t.guestProfile;
  const { locale } = useLanguage();

  const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:    { label: tp.statusPendingApproval, color: T.warning,  bg: T.warningBg },
    ACTIVE:     { label: tp.statusActive,          color: T.success,  bg: T.successBg },
    APPROVED:   { label: tp.statusApproved,        color: T.success,  bg: T.successBg },
    DISCHARGED: { label: tp.statusDischarged,      color: T.textSec,  bg: T.inactiveBg },
    CANCELLED:  { label: tp.statusCancelled,       color: T.danger,   bg: T.dangerBg },
  };

  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  async function copyKey() {
    if (!patient?.patientKey) return;
    const ok = await copyToClipboard(patient.patientKey);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      Alert.alert(tp.copy, patient.patientKey);
    }
  }

  function handleLogout() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(tp.signOutWebMsg)) {
        doLogout();
      }
    } else {
      Alert.alert(tp.signOutTitle, tp.signOutBody, [
        { text: tp.signOutCancel, style: "cancel" },
        { text: tp.signOut, style: "destructive", onPress: doLogout },
      ]);
    }
  }

  async function doLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  function handleDeleteAccount() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(tp.deleteAccountWebMsg)) {
        void doDeleteAccount();
      }
    } else {
      Alert.alert(tp.deleteAccountTitle, tp.deleteAccountBody, [
        { text: tp.deleteAccountCancel, style: "cancel" },
        { text: tp.deleteAccountConfirm, style: "destructive", onPress: () => void doDeleteAccount() },
      ]);
    }
  }

  async function doDeleteAccount() {
    setDeletingAccount(true);
    try {
      await apiRequest("POST", "/v1/patient/account/delete");
      if (Platform.OS === "web") {
        alert(`${tp.deleteAccountSuccessTitle}\n${tp.deleteAccountSuccessBody}`);
      } else {
        Alert.alert(tp.deleteAccountSuccessTitle, tp.deleteAccountSuccessBody);
      }
      await logout();
    } catch {
      Alert.alert(tp.deleteAccountTitle, tp.deleteAccountError);
    } finally {
      setDeletingAccount(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.root}>
        <GuestHeader title={tp.pageTitle} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={styles.root}>
        <GuestHeader title={tp.pageTitle} />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={styles.errorTitle}>{tp.errorTitle}</Text>
          <Pressable onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>{tp.tryAgain}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusCfg =
    STATUS_LABELS[patient.status?.toUpperCase()] ?? STATUS_LABELS.PENDING;
  const initials = patient.fullName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const flag = countryFlag(patient.nationality);

  const hasClinicInfo =
    patient.clinicName ||
    patient.clinicAddress ||
    patient.clinicSupportPhone ||
    patient.clinicSupportEmail ||
    patient.clinicWebsite;

  const hasManagerInfo =
    manager?.fullName || manager?.phone || manager?.email;

  return (
    <View style={styles.root}>
      <GuestHeader title={tp.pageTitle} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: scrollBottomPadding },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero card ── */}
        <View style={[styles.heroCard, cardShadow]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.heroName}>
            {flag}
            {patient.fullName}
          </Text>
          {patient.nationality ? (
            <Text style={styles.heroNat}>{patient.nationality}</Text>
          ) : null}
          <View
            style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}
          >
            <Text
              style={[styles.statusPillText, { color: statusCfg.color }]}
            >
              {statusCfg.label}
            </Text>
          </View>

          {/* Patient key copy */}
          <Pressable style={styles.keyRow} onPress={copyKey}>
            <Ionicons name="key-outline" size={13} color={T.textMuted} />
            <Text style={styles.keyText}>{patient.patientKey}</Text>
            <View
              style={[
                styles.copyBadge,
                copied ? styles.copyBadgeDone : null,
              ]}
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={11}
                color={copied ? T.success : T.textMuted}
              />
              <Text
                style={[
                  styles.copyTxt,
                  copied ? { color: T.success } : null,
                ]}
              >
                {copied ? tp.copied : tp.copy}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ── Person Info ── */}
        <View style={[styles.card, cardShadow]}>
          <SectionHeader label={tp.sectionPersonInfo} />
          <InfoRow
            icon="mail-outline"
            label={tp.labelEmail}
            value={patient.email}
            onPress={
              patient.email
                ? () => Linking.openURL(`mailto:${patient.email}`)
                : undefined
            }
          />
          {patient.email && patient.phone ? <Divider /> : null}
          <InfoRow
            icon="call-outline"
            label={tp.labelPhone}
            value={patient.phone}
            onPress={
              patient.phone
                ? () => Linking.openURL(`tel:${patient.phone}`)
                : undefined
            }
          />
          {(patient.phone || patient.email) &&
          (patient.arrivalDate || patient.departureDate) ? (
            <Divider />
          ) : null}
          <InfoRow
            icon="airplane-outline"
            label={tp.labelArrival}
            value={
              patient.arrivalDate
                ? new Date(patient.arrivalDate).toLocaleDateString(dateLocale, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : null
            }
          />
          {patient.arrivalDate && patient.departureDate ? <Divider /> : null}
          <InfoRow
            icon="airplane-outline"
            label={tp.labelDeparture}
            value={
              patient.departureDate
                ? new Date(patient.departureDate).toLocaleDateString(
                    dateLocale,
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )
                : null
            }
          />
        </View>

        {/* ── Clinic Info ── */}
        {hasClinicInfo ? (
          <View style={[styles.card, cardShadow]}>
            <SectionHeader label={tp.sectionClinicInfo} />
            {patient.clinicName ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={T.accent}
                  />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{tp.labelClinic}</Text>
                  <Text style={styles.infoValue}>{frameDisplayText(patient.clinicName)}</Text>
                </View>
              </View>
            ) : null}
            {patient.clinicName && patient.clinicAddress ? <Divider /> : null}
            <InfoRow
              icon="location-outline"
              label={tp.labelAddress}
              value={patient.clinicAddress}
            />
            {patient.clinicAddress && patient.clinicSupportPhone ? (
              <Divider />
            ) : null}
            <InfoRow
              icon="call-outline"
              label={tp.labelPhone}
              value={patient.clinicSupportPhone}
              onPress={
                patient.clinicSupportPhone
                  ? () =>
                      Linking.openURL(`tel:${patient.clinicSupportPhone}`)
                  : undefined
              }
            />
            {patient.clinicSupportPhone && patient.clinicSupportEmail ? (
              <Divider />
            ) : null}
            <InfoRow
              icon="mail-outline"
              label={tp.labelEmail}
              value={patient.clinicSupportEmail}
              onPress={
                patient.clinicSupportEmail
                  ? () =>
                      Linking.openURL(`mailto:${patient.clinicSupportEmail}`)
                  : undefined
              }
            />
            {patient.clinicSupportEmail && patient.clinicWebsite ? (
              <Divider />
            ) : null}
            <InfoRow
              icon="globe-outline"
              label={tp.labelWebsite}
              value={patient.clinicWebsite}
              onPress={
                patient.clinicWebsite
                  ? () => Linking.openURL(patient.clinicWebsite!)
                  : undefined
              }
            />
          </View>
        ) : null}

        {/* ── Manager Contact ── */}
        {hasManagerInfo ? (
          <View style={[styles.card, cardShadow]}>
            <SectionHeader label={tp.sectionManager} />
            {manager?.fullName ? (
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <Ionicons
                    name="person-circle-outline"
                    size={16}
                    color={T.accent}
                  />
                </View>
                <View style={styles.infoText}>
                  <Text style={styles.infoLabel}>{tp.labelManager}</Text>
                  <Text style={styles.infoValue}>{manager.fullName}</Text>
                </View>
              </View>
            ) : null}
            {manager?.fullName && manager?.phone ? <Divider /> : null}
            <InfoRow
              icon="call-outline"
              label={tp.labelPhone}
              value={manager?.phone}
              onPress={
                manager?.phone
                  ? () => Linking.openURL(`tel:${manager.phone}`)
                  : undefined
              }
            />
            {manager?.phone && manager?.email ? <Divider /> : null}
            <InfoRow
              icon="mail-outline"
              label={tp.labelEmail}
              value={manager?.email}
              onPress={
                manager?.email
                  ? () => Linking.openURL(`mailto:${manager.email}`)
                  : undefined
              }
            />
          </View>
        ) : null}

        {/* ── Delete account ── */}
        <View style={[styles.card, cardShadow, styles.deleteCard]}>
          <SectionHeader label={tp.deleteAccountTitle} />
          <Text style={styles.deleteBody}>{tp.deleteAccountBody}</Text>
          <Pressable
            style={[styles.deleteBtn, deletingAccount && { opacity: 0.6 }]}
            onPress={handleDeleteAccount}
            disabled={deletingAccount || loggingOut}
          >
            {deletingAccount ? (
              <ActivityIndicator size="small" color={T.danger} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={T.danger} />
                <Text style={styles.deleteBtnText}>{tp.deleteAccountConfirm}</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ── Sign out ── */}
        <Pressable
          style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={loggingOut || deletingAccount}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={T.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color={T.danger} />
              <Text style={styles.logoutText}>{tp.signOut}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { padding: T.sp16, gap: T.sp12 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  errorTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 17, color: T.text },
  retryBtn: {
    backgroundColor: T.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: T.r10,
  },
  retryText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  heroCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: T.sp24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    shadowColor: T.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarText: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 30, color: "#fff" },
  heroName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: T.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  heroNat: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 2,
  },
  statusPillText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 12 },

  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 6,
    backgroundColor: T.surfaceSubtle,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
  },
  keyText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.textSec,
    letterSpacing: 1.5,
    flex: 1,
  },
  copyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.bg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  copyBadgeDone: {
    borderColor: T.success,
    backgroundColor: T.successBg,
  },
  copyTxt: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    color: T.textMuted,
  },

  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  sectionHeader: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: T.sp16,
    paddingTop: T.sp16,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: T.sp16,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(3,105,161,0.08)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: { flex: 1, gap: 2 },
  infoLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.text,
  },

  deleteCard: {
    paddingBottom: T.sp16,
  },
  deleteBody: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 20,
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: T.sp16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.dangerBorder,
    backgroundColor: T.dangerBg,
  },
  deleteBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: T.danger,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.dangerBg,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: T.dangerBorder,
  },
  logoutText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: T.danger,
  },
});
