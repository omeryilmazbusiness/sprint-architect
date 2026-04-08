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
import { format, isToday, parseISO } from "date-fns";
import { T, cardShadow } from "@/constants/adminTheme";
import { StatusPill, Divider } from "@/components/ui";
import type { ScheduleAppt } from "@/hooks/useManagerMonthAppointments";

interface RowProps {
  appt: ScheduleAppt;
}

function ApptRow({ appt }: RowProps) {
  const time = format(parseISO(appt.startAt), "HH:mm");
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.78 : 1 }]}
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
        <Text style={styles.patient} numberOfLines={1}>
          {appt.patientName}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {appt.title}
        </Text>
        {appt.doctorName ? (
          <Text style={styles.doctor} numberOfLines={1}>
            {appt.doctorName}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <StatusPill status={appt.status} />
        {appt.patientId ? (
          <Ionicons name="chevron-forward" size={12} color={T.textMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}

interface Props {
  selectedDay: Date;
  appointments: ScheduleAppt[];
  isLoading: boolean;
}

export function DayAgendaCard({ selectedDay, appointments, isLoading }: Props) {
  const todaySelected = isToday(selectedDay);
  const title = todaySelected
    ? "Today's Appointments"
    : `Appointments for ${format(selectedDay, "MMM d")}`;

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: T.success }]} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        {appointments.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{appointments.length}</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={T.accent} />
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={22} color={T.border} />
          <Text style={styles.emptyText}>No appointments scheduled.</Text>
        </View>
      ) : (
        appointments.map((appt, i) => (
          <React.Fragment key={appt.id}>
            {i > 0 && <Divider />}
            <ApptRow appt={appt} />
          </React.Fragment>
        ))
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.surfaceSubtle,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
  },
  countBadge: {
    backgroundColor: T.success + "20",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: T.successBorder,
  },
  countText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    color: T.success,
  },
  center: {
    padding: T.sp24,
    alignItems: "center",
  },
  empty: {
    padding: T.sp20,
    alignItems: "center",
    gap: T.sp8,
    flexDirection: "row",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  timeBox: {
    width: 44,
    height: 36,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
    flexShrink: 0,
  },
  timeText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    color: T.accent,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  patient: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 13,
    color: T.text,
  },
  title: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.text,
    opacity: 0.75,
  },
  doctor: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
});
