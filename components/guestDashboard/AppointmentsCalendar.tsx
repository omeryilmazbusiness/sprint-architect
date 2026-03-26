import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { CalendarDay, CalendarMark } from "@/hooks/guest/useGuestAgenda";

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CellColors { bg: string; textColor: string; border?: string }

function getCellColors(mark: CalendarMark, isSelected: boolean, hasAppt: boolean): CellColors {
  if (isSelected) return { bg: T.accent, textColor: "#fff", border: T.accent };
  if (!hasAppt)   return { bg: "transparent", textColor: T.text };
  switch (mark) {
    case "past-done":        return { bg: "#F3F4F6", textColor: "#4B5563" };
    case "past-missed":      return { bg: "#FEE2E2", textColor: "#DC2626" };
    case "today":            return { bg: "#059669", textColor: "#fff" };
    case "future-scheduled": return { bg: "#D1FAE5", textColor: "#065F46" };
    case "future-cancelled": return { bg: "#111827", textColor: "#F9FAFB" };
    default:                 return { bg: "transparent", textColor: T.text };
  }
}

const LEGEND = [
  { label: "Done",      bg: "#F3F4F6", tc: "#4B5563" },
  { label: "Missed",    bg: "#FEE2E2", tc: "#DC2626" },
  { label: "Today",     bg: "#059669", tc: "#fff" },
  { label: "Upcoming",  bg: "#D1FAE5", tc: "#065F46" },
  { label: "Cancelled", bg: "#111827", tc: "#F9FAFB" },
];

const TODAY = new Date();
function isToday(d: CalendarDay) {
  return (
    d.day > 0 &&
    d.date.getFullYear() === TODAY.getFullYear() &&
    d.date.getMonth() === TODAY.getMonth() &&
    d.date.getDate() === TODAY.getDate()
  );
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
  days, monthLabel, selectedDate, onSelectDay, onPrev, onNext,
}: Props) {
  const isSel = (d: CalendarDay) =>
    d.day > 0 &&
    d.date.getFullYear() === selectedDate.getFullYear() &&
    d.date.getMonth() === selectedDate.getMonth() &&
    d.date.getDate() === selectedDate.getDate();

  const todayDay = days.find(isToday);

  return (
    <View style={[styles.card, cardShadow]}>
      {/* Header row */}
      <View style={styles.navRow}>
        <Pressable onPress={onPrev} style={styles.navBtn} hitSlop={14}>
          <Ionicons name="chevron-back" size={20} color={T.accent} />
        </Pressable>

        <View style={styles.monthCenter}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
        </View>

        <View style={styles.navRight}>
          {todayDay ? (
            <Pressable
              style={styles.todayBtn}
              onPress={() => onSelectDay(todayDay.date)}
              hitSlop={8}
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onNext} style={styles.navBtn} hitSlop={14}>
            <Ionicons name="chevron-forward" size={20} color={T.accent} />
          </Pressable>
        </View>
      </View>

      {/* Day-of-week header */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((d) => (
          <Text key={d} style={styles.weekDay}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.grid}>
        {days.map((d, i) => {
          if (d.day === 0) return <View key={`e-${i}`} style={styles.cell} />;
          const sel = isSel(d);
          const { bg, textColor, border } = getCellColors(d.mark, sel, d.hasAppointment);
          const today = isToday(d);
          return (
            <Pressable
              key={`d-${i}`}
              style={[
                styles.cell,
                { backgroundColor: bg },
                border ? { borderWidth: 2, borderColor: border } : null,
                today && !sel ? styles.cellToday : null,
              ]}
              onPress={() => onSelectDay(d.date)}
              android_ripple={{ color: "rgba(3,105,161,0.12)" }}
            >
              <Text style={[styles.dayNum, { color: textColor }, today && !sel ? styles.dayNumToday : null]}>
                {d.day}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendDivider} />
      <View style={styles.legend}>
        {LEGEND.map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: l.bg }]}>
              <Text style={[styles.swatchTxt, { color: l.tc }]}>{l.label[0]}</Text>
            </View>
            <Text style={styles.legendLabel}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp20,
    marginBottom: T.sp12,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: T.sp16,
  },
  navBtn: {
    width: 36, height: 36,
    alignItems: "center", justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(3,105,161,0.07)",
  },
  monthCenter: { flex: 1, alignItems: "center" },
  monthLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 18, color: T.text, letterSpacing: -0.3,
  },
  navRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayBtn: {
    backgroundColor: "rgba(3,105,161,0.08)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "rgba(3,105,161,0.2)",
  },
  todayBtnText: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: T.accent,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: T.sp10,
  },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontFamily: "Inter_700Bold",
    fontSize: 11, color: T.textMuted,
    textTransform: "uppercase", letterSpacing: 0.3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginBottom: 4,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: "#059669",
  },
  dayNum: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 20,
  },
  dayNumToday: {
    fontFamily: "Inter_700Bold",
    color: "#059669",
  },
  legendDivider: {
    height: 1, backgroundColor: T.border,
    marginTop: T.sp16, marginBottom: T.sp12,
  },
  legend: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  swatch: {
    width: 20, height: 20, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  swatchTxt: { fontFamily: "Inter_700Bold", fontSize: 9 },
  legendLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted },
});
