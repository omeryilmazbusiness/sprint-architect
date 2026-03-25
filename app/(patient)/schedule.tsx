import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestSchedule, PatientAppointment } from "@/hooks/guest/useGuestSchedule";
import { T, cardShadow } from "@/constants/adminTheme";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    bg: "#EFF6FF",
    text: T.accent,
    icon: "time-outline",
  },
  DONE: {
    label: "Completed",
    bg: T.successBg,
    text: T.success,
    icon: "checkmark-circle-outline",
  },
  CANCELLED: {
    label: "Cancelled",
    bg: T.dangerBg,
    text: T.danger,
    icon: "close-circle-outline",
  },
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };
  } catch {
    return { date: iso, time: "" };
  }
}

function ApptCard({ appt }: { appt: PatientAppointment }) {
  const { date, time } = fmtDate(appt.startAt);
  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.SCHEDULED;
  const doctorName =
    appt.doctor?.fullName ?? appt.doctor?.name ?? null;

  return (
    <View style={[styles.apptCard, cardShadow]}>
      <View style={styles.apptDateBadge}>
        <Text style={styles.apptDateText}>{date}</Text>
        <Text style={styles.apptTimeText}>{time}</Text>
      </View>
      <View style={styles.apptDivider} />
      <View style={styles.apptBody}>
        <Text style={styles.apptTitle} numberOfLines={1}>
          {appt.title}
        </Text>
        {doctorName ? (
          <View style={styles.apptMeta}>
            <Ionicons name="person-outline" size={13} color={T.textMuted} />
            <Text style={styles.apptMetaText}>Dr. {doctorName}</Text>
          </View>
        ) : null}
        <View
          style={[styles.statusPill, { backgroundColor: cfg.bg }]}
        >
          <Ionicons
            name={cfg.icon as any}
            size={12}
            color={cfg.text}
          />
          <Text style={[styles.statusPillText, { color: cfg.text }]}>
            {cfg.label}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { isLoading, isError, refetch, upcoming, past, next } =
    useGuestSchedule();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }

  if (isLoading) {
    return (
      <View style={styles.root}>
        <GuestHeader title="Schedule" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={styles.centerText}>Loading schedule…</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.root}>
        <GuestHeader title="Schedule" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={styles.errorTitle}>Couldn't load schedule</Text>
          <Pressable onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const hasAny = upcoming.length > 0 || past.length > 0;

  return (
    <View style={styles.root}>
      <GuestHeader
        title="Schedule"
        subtitle={
          next
            ? `Next: ${fmtDate(next.startAt).date}`
            : upcoming.length === 0
            ? "No upcoming appointments"
            : undefined
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.accent}
          />
        }
      >
        {!hasAny ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="calendar-outline"
                size={40}
                color={T.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>No appointments yet</Text>
            <Text style={styles.emptyBody}>
              Your clinic will schedule your appointments here.
            </Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Upcoming</Text>
                {upcoming.map((a) => (
                  <ApptCard key={a.id} appt={a} />
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                  Past
                </Text>
                {past.slice(0, 5).map((a) => (
                  <ApptCard key={a.id} appt={a} />
                ))}
              </>
            )}
          </>
        )}
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
    gap: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  centerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.textMuted,
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
  sectionLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  apptCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
  },
  apptDateBadge: {
    backgroundColor: T.primary,
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  apptDateText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  apptTimeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#fff",
    textAlign: "center",
    marginTop: 2,
  },
  apptDivider: {
    width: 1,
    backgroundColor: T.border,
  },
  apptBody: {
    flex: 1,
    padding: 14,
    gap: 6,
  },
  apptTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  apptMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  apptMetaText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.inactiveBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
  },
  emptyBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
