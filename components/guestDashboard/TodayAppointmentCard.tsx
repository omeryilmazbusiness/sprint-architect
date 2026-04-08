import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";
import type { PatientAppointment } from "@/hooks/guest/useGuestDashboard";

interface Props {
  appointment: PatientAppointment | null;
}

export function TodayAppointmentCard({ appointment }: Props) {
  const t = useT();
  const tg = t.guestDashboard;

  const STATUS_CONFIG = {
    SCHEDULED: { label: tg.todayStatusScheduled, bg: T.successBg, text: T.success },
    DONE: { label: tg.todayStatusDone, bg: T.inactiveBg, text: T.inactiveText },
    CANCELLED: { label: tg.todayStatusCancelled, bg: T.dangerBg, text: T.danger },
  } as const;

  const cfg = appointment
    ? (STATUS_CONFIG[appointment.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.SCHEDULED)
    : null;

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={16} color={T.accent} />
        <Text style={styles.label}>{tg.todayCardLabel}</Text>
      </View>

      {!appointment ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>{tg.todayCardEmpty}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Ionicons name="time-outline" size={14} color={T.accent} />
              <Text style={styles.time}>
                {new Date(appointment.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            {cfg && (
              <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{appointment.title}</Text>
          {appointment.doctor?.fullName ? (
            <View style={styles.doctorRow}>
              <Ionicons name="person-circle-outline" size={14} color={T.textSec} />
              <Text style={styles.doctorName}>{tg.drPrefix}{appointment.doctor.fullName}</Text>
              {appointment.doctor.specialty ? (
                <Text style={styles.doctorSpec}> · {appointment.doctor.specialty}</Text>
              ) : null}
            </View>
          ) : null}
          {appointment.locationText ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={T.textSec} />
              <Text style={styles.locationText} numberOfLines={1}>{appointment.locationText}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: T.sp12,
  },
  label: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: "center",
    paddingVertical: T.sp16,
    gap: 8,
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
  body: { gap: T.sp8 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  time: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: T.primary,
  },
  statusPill: {
    borderRadius: T.r20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
  },
  title: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: T.text,
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  doctorName: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  doctorSpec: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
  },
});
