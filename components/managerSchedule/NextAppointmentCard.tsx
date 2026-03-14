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
import { StatusPill } from "@/components/ui";
import type { ScheduleAppt } from "@/hooks/useManagerMonthAppointments";

interface Props {
  appointment: ScheduleAppt | null;
  isLoading: boolean;
}

export function NextAppointmentCard({ appointment, isLoading }: Props) {
  function handlePress() {
    if (appointment?.patientId) {
      router.push({
        pathname: "/(manager)/patients/[id]",
        params: { id: appointment.patientId },
      });
    }
  }

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.dot, { backgroundColor: T.accent }]} />
          <Text style={styles.headerTitle}>Next Appointment</Text>
        </View>
        {appointment && <StatusPill status={appointment.status} />}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={T.accent} />
        </View>
      ) : !appointment ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={22} color={T.border} />
          <Text style={styles.emptyText}>No upcoming appointments.</Text>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.heroRow, { opacity: pressed ? 0.82 : 1 }]}
          onPress={handlePress}
        >
          {/* Date/Time pill */}
          <View style={styles.datePill}>
            <Text style={styles.dateDay}>
              {format(parseISO(appointment.startAt), "d")}
            </Text>
            <Text style={styles.dateMonth}>
              {format(parseISO(appointment.startAt), "MMM")}
            </Text>
            <Text style={styles.dateTime}>
              {format(parseISO(appointment.startAt), "HH:mm")}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.heroInfo}>
            <Text style={styles.heroPatient} numberOfLines={1}>
              {appointment.patientName}
            </Text>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {appointment.title}
            </Text>
            {appointment.doctorName ? (
              <Text style={styles.heroDoctor} numberOfLines={1}>
                {appointment.doctorName}
              </Text>
            ) : null}
          </View>

          {/* Arrow */}
          {appointment.patientId ? (
            <View style={styles.arrowWrap}>
              <Ionicons name="arrow-forward-circle" size={24} color={T.accent} />
            </View>
          ) : null}
        </Pressable>
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
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
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
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: T.sp16,
    gap: T.sp16,
  },
  datePill: {
    width: 52,
    paddingVertical: T.sp8,
    borderRadius: T.r10,
    backgroundColor: T.accent + "10",
    borderWidth: 1,
    borderColor: T.accent + "30",
    alignItems: "center",
    gap: 1,
    flexShrink: 0,
  },
  dateDay: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: T.accent,
    lineHeight: 24,
  },
  dateMonth: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateTime: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textMuted,
    marginTop: 2,
  },
  heroInfo: {
    flex: 1,
    gap: 3,
  },
  heroPatient: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 15,
    color: T.text,
  },
  heroTitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.text,
    opacity: 0.75,
  },
  heroDoctor: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  arrowWrap: {
    flexShrink: 0,
  },
});
