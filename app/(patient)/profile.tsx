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
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestProfile } from "@/hooks/guest/useGuestProfile";
import { T, cardShadow } from "@/constants/adminTheme";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending Approval", color: T.warning, bg: T.warningBg },
  ACTIVE: { label: "Active", color: T.success, bg: T.successBg },
  APPROVED: { label: "Approved", color: T.success, bg: T.successBg },
  DISCHARGED: { label: "Discharged", color: T.textSec, bg: T.inactiveBg },
  CANCELLED: { label: "Cancelled", color: T.danger, bg: T.dangerBg },
};

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={16} color={T.textMuted} style={styles.infoIcon} />
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { logout } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const { isLoading, isError, refetch, patient, plan } = useGuestProfile();
  const [loggingOut, setLoggingOut] = useState(false);

  function handleLogout() {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Sign out of your account?")) {
        doLogout();
      }
    } else {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign Out", style: "destructive", onPress: doLogout },
        ]
      );
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

  if (isLoading) {
    return (
      <View style={styles.root}>
        <GuestHeader title="Profile" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      </View>
    );
  }

  if (isError || !patient) {
    return (
      <View style={styles.root}>
        <GuestHeader title="Profile" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={styles.errorTitle}>Couldn't load profile</Text>
          <Pressable onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const statusCfg =
    STATUS_LABELS[patient.status?.toUpperCase()] ??
    STATUS_LABELS.PENDING;

  const initial = patient.fullName?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <View style={styles.root}>
      <GuestHeader title="Profile" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <View style={[styles.heroCard, cardShadow]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.heroName}>{patient.fullName}</Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusCfg.bg },
            ]}
          >
            <Text style={[styles.statusPillText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
          <View style={styles.keyRow}>
            <Ionicons name="key-outline" size={14} color={T.textMuted} />
            <Text style={styles.keyText}>{patient.patientKey}</Text>
          </View>
        </View>

        {/* Plan info */}
        {(plan.doctor || plan.hotel) ? (
          <View style={[styles.card, cardShadow]}>
            <Text style={styles.cardTitle}>Your Care Plan</Text>
            {plan.doctor ? (
              <InfoRow
                icon="person-circle-outline"
                label="Assigned Doctor"
                value={plan.doctor.name}
              />
            ) : null}
            {plan.doctor?.specialty ? (
              <InfoRow
                icon="medical-outline"
                label="Specialty"
                value={plan.doctor.specialty}
              />
            ) : null}
            {plan.hotel ? (
              <InfoRow
                icon="bed-outline"
                label="Hotel"
                value={plan.hotel.name}
              />
            ) : null}
            {plan.hotel?.address ? (
              <InfoRow
                icon="location-outline"
                label="Address"
                value={plan.hotel.address}
              />
            ) : null}
          </View>
        ) : null}

        {/* Sign out */}
        <Pressable
          style={[styles.logoutBtn, loggingOut && { opacity: 0.6 }]}
          onPress={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={T.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color={T.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
  },
  retryBtn: {
    backgroundColor: T.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  heroCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#fff",
  },
  heroName: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: T.text,
    textAlign: "center",
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  keyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  keyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textMuted,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.text,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.dangerBg,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: T.dangerBorder,
  },
  logoutText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.danger,
  },
});
