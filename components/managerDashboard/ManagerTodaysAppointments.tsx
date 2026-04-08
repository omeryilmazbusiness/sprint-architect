import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { format, parseISO } from "date-fns";
import { T, cardShadow } from "@/constants/adminTheme";
import { StatusPill, Divider } from "@/components/ui";
import type { DashboardAppt } from "@/hooks/useManagerDashboard";

interface ApptRowProps {
  appt: DashboardAppt;
}

function ApptRow({ appt }: ApptRowProps) {
  const time = format(parseISO(appt.startAt), "HH:mm");
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}
      onPress={() => {
        if (appt.patientId) {
          router.push({
            pathname: "/(manager)/patients/[id]",
            params: { id: appt.patientId },
          });
        }
      }}
    >
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{time}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {appt.patientName}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {appt.title}
          {appt.doctorName ? ` · Dr. ${appt.doctorName}` : ""}
        </Text>
      </View>
      <StatusPill status={appt.status} />
    </Pressable>
  );
}

interface Props {
  appointments: DashboardAppt[];
  isLoading: boolean;
  total: number;
}

export function ManagerTodaysAppointments({ appointments, isLoading, total }: Props) {
  return (
    <View style={[styles.card, cardShadow]}>
      {isLoading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="small" color={T.accent} />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={24} color={T.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No appointments today</Text>
          <Text style={styles.emptyBody}>
            Schedule an appointment to see it here.
          </Text>
        </View>
      ) : (
        <>
          {appointments.map((appt, i) => (
            <React.Fragment key={appt.id}>
              {i > 0 && <Divider />}
              <ApptRow appt={appt} />
            </React.Fragment>
          ))}
          {total > appointments.length && (
            <Pressable
              style={styles.moreRow}
              onPress={() => router.push("/(manager-tabs)/users")}
            >
              <Text style={styles.moreText}>
                +{total - appointments.length} more today
              </Text>
              <Ionicons name="chevron-forward" size={14} color={T.accent} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  empty: {
    padding: T.sp24,
    alignItems: "center",
    gap: T.sp8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
    marginTop: 2,
  },
  emptyBody: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  timeBox: {
    width: 46,
    height: 36,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  timeText: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 11,
    color: T.accent,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
  },
  sub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  moreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: T.sp12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  moreText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.accent,
  },
});
