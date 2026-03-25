import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { CalendarDay } from "@/hooks/guest/useGuestAgenda";

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface Props {
  days: CalendarDay[];
  monthLabel: string;
  selectedDate: Date;
  onSelectDay: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function AppointmentsCalendar({
  days,
  monthLabel,
  selectedDate,
  onSelectDay,
  onPrev,
  onNext,
}: Props) {
  const isSelected = (d: CalendarDay) =>
    d.day > 0 &&
    d.date.getFullYear() === selectedDate.getFullYear() &&
    d.date.getMonth() === selectedDate.getMonth() &&
    d.date.getDate() === selectedDate.getDate();

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.navRow}>
        <Pressable onPress={onPrev} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={T.accent} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={onNext} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={T.accent} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {days.map((d, i) => {
          if (d.day === 0) {
            return <View key={`empty-${i}`} style={styles.cell} />;
          }

          const sel = isSelected(d);
          let cellBg = "transparent";
          let numColor = T.text;
          let dotColor: string | null = null;

          if (sel) {
            cellBg = T.accent;
            numColor = "#fff";
          } else if (d.isToday) {
            cellBg = T.primary;
            numColor = "#fff";
          }

          if (!sel && d.hasAppointment) {
            if (d.mark === "past") dotColor = T.textMuted;
            else if (d.mark === "future") dotColor = T.success;
            else if (d.mark === "today") dotColor = "#fff";
          }

          return (
            <Pressable
              key={`day-${i}`}
              style={[styles.cell, { backgroundColor: cellBg }]}
              onPress={() => onSelectDay(d.date)}
            >
              <Text style={[styles.dayNum, { color: numColor }]}>{d.day}</Text>
              {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
            </Pressable>
          );
        })}
      </View>
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
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: T.sp8,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
  },
  dayNum: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
