import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { CalendarDay, CalendarMark } from "@/hooks/guest/useGuestAgenda";

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const LEGEND: { mark: CalendarMark; label: string; dotColor: string; filled?: boolean }[] = [
  { mark: "past-done", label: "Completed", dotColor: "#9CA3AF" },
  { mark: "past-missed", label: "Missed / Overdue", dotColor: "#FCA5A5" },
  { mark: "today", label: "Today", dotColor: "#059669", filled: true },
  { mark: "future-scheduled", label: "Scheduled", dotColor: "#6EE7B7" },
  { mark: "future-cancelled", label: "Cancelled", dotColor: "#F87171" },
];

function getDotColor(mark: CalendarMark): string | null {
  switch (mark) {
    case "past-done":        return "#9CA3AF";
    case "past-missed":      return "#FCA5A5";
    case "today":            return "#fff";
    case "future-scheduled": return "#6EE7B7";
    case "future-cancelled": return "#F87171";
    default:                 return null;
  }
}

function getCellBg(mark: CalendarMark, isSelected: boolean): string {
  if (isSelected) return T.accent;
  if (mark === "today") return "#059669";
  return "transparent";
}

function getNumColor(mark: CalendarMark, isSelected: boolean): string {
  if (isSelected || mark === "today") return "#fff";
  return T.text;
}

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
  const isSel = (d: CalendarDay) =>
    d.day > 0 &&
    d.date.getFullYear() === selectedDate.getFullYear() &&
    d.date.getMonth() === selectedDate.getMonth() &&
    d.date.getDate() === selectedDate.getDate();

  return (
    <View style={[styles.card, cardShadow]}>
      {/* Month nav */}
      <View style={styles.navRow}>
        <Pressable onPress={onPrev} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color={T.accent} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={onNext} style={styles.navBtn} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color={T.accent} />
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {days.map((d, i) => {
          if (d.day === 0) return <View key={`e-${i}`} style={styles.cell} />;
          const sel = isSel(d);
          const cellBg = getCellBg(d.mark, sel);
          const numColor = getNumColor(d.mark, sel);
          const dotColor = (!sel && d.hasAppointment) ? getDotColor(d.mark) : null;

          return (
            <Pressable
              key={`d-${i}`}
              style={[styles.cell, { backgroundColor: cellBg }]}
              onPress={() => onSelectDay(d.date)}
            >
              <Text style={[styles.dayNum, { color: numColor }]}>{d.day}</Text>
              {dotColor ? (
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendDivider} />
      <View style={styles.legend}>
        {LEGEND.map((l) => (
          <View key={l.mark ?? "null"} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: l.dotColor,
                  borderRadius: l.filled ? 5 : 3,
                  width: l.filled ? 10 : 6,
                  height: l.filled ? 10 : 6,
                },
              ]}
            />
            <Text style={styles.legendLabel}>{l.label}</Text>
          </View>
        ))}
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
  legendDivider: {
    height: 1,
    backgroundColor: T.border,
    marginTop: T.sp12,
    marginBottom: T.sp12,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: T.sp8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textMuted,
  },
});
