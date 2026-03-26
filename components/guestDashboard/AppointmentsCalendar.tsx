import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { CalendarDay, CalendarMark } from "@/hooks/guest/useGuestAgenda";

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CellColors { bg: string; textColor: string }

function getCellColors(mark: CalendarMark, isSelected: boolean, hasAppt: boolean): CellColors {
  if (isSelected) return { bg: T.accent, textColor: "#fff" };
  if (!hasAppt)   return { bg: "transparent", textColor: T.text };
  switch (mark) {
    case "past-done":        return { bg: "#F3F4F6", textColor: "#6B7280" };
    case "past-missed":      return { bg: "#FEE2E2", textColor: "#DC2626" };
    case "today":            return { bg: "#059669", textColor: "#fff" };
    case "future-scheduled": return { bg: "#D1FAE5", textColor: "#065F46" };
    case "future-cancelled": return { bg: "#FEE2E2", textColor: "#B91C1C" };
    default:                 return { bg: "transparent", textColor: T.text };
  }
}

const LEGEND = [
  { label: "Done",      bg: "#F3F4F6", tc: "#6B7280" },
  { label: "Missed",    bg: "#FEE2E2", tc: "#DC2626" },
  { label: "Today",     bg: "#059669", tc: "#fff" },
  { label: "Scheduled", bg: "#D1FAE5", tc: "#065F46" },
  { label: "Cancelled", bg: "#FECACA", tc: "#B91C1C" },
];

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
          if (d.day === 0) return <View key={`e-${i}`} style={styles.cell} />;
          const sel = isSel(d);
          const { bg, textColor } = getCellColors(d.mark, sel, d.hasAppointment);
          return (
            <Pressable
              key={`d-${i}`}
              style={[styles.cell, { backgroundColor: bg }, sel ? styles.cellSel : null]}
              onPress={() => onSelectDay(d.date)}
            >
              <Text style={[styles.dayNum, { color: textColor }]}>{d.day}</Text>
            </Pressable>
          );
        })}
      </View>

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
    marginBottom: T.sp16,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
    backgroundColor: "rgba(3,105,161,0.06)",
  },
  monthLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
    letterSpacing: -0.3,
  },
  weekRow: { flexDirection: "row", marginBottom: T.sp8 },
  weekDay: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
  },
  cellSel: {
    shadowColor: T.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  dayNum: { fontFamily: "Inter_500Medium", fontSize: 13 },
  legendDivider: {
    height: 1,
    backgroundColor: T.border,
    marginTop: T.sp12,
    marginBottom: T.sp12,
  },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: T.sp8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchTxt: { fontFamily: "Inter_700Bold", fontSize: 8 },
  legendLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: T.textMuted },
});
