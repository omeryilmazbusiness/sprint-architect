import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  addMonths,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { T, cardShadow } from "@/constants/adminTheme";
import type { DayMarker } from "@/hooks/useScheduleDerivedData";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// ─── Status color config ───────────────────────────────────────────────────────

const MARKER_CFG: Record<DayMarker, { bg: string; tc: string; strip: string; label: string }> = {
  today:     { bg: T.success,       tc: "#fff",     strip: T.success,   label: "Today" },
  upcoming:  { bg: "#EFF6FF",       tc: T.accent,   strip: T.accent,    label: "Upcoming" },
  completed: { bg: T.successBg,     tc: T.success,  strip: T.success,   label: "Completed" },
  missed:    { bg: "#FEF3C7",       tc: "#D97706",  strip: "#D97706",   label: "Missed" },
  cancelled: { bg: T.dangerBg,      tc: T.danger,   strip: T.danger,    label: "Cancelled" },
};

interface Props {
  currentMonth: Date;
  selectedDay: Date;
  dayMarkers: Record<string, DayMarker>;
  isLoading: boolean;
  onMonthChange: (d: Date) => void;
  onDaySelect: (d: Date) => void;
}

export function MonthlyCalendar({
  currentMonth,
  selectedDay,
  dayMarkers,
  isLoading,
  onMonthChange,
  onDaySelect,
}: Props) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calDays = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  });

  return (
    <View style={[styles.card, cardShadow]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => onMonthChange(subMonths(currentMonth, 1))}
            style={styles.navBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={T.primary} />
          </Pressable>
          <Text style={styles.monthTitle}>
            {format(currentMonth, "MMMM yyyy")}
          </Text>
          <Pressable
            onPress={() => onMonthChange(addMonths(currentMonth, 1))}
            style={styles.navBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={T.primary} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            const today = new Date();
            onMonthChange(today);
            onDaySelect(today);
          }}
          style={styles.todayBtn}
        >
          <Text style={styles.todayBtnText}>Today</Text>
        </Pressable>
      </View>

      {/* Week headers */}
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <Text key={i} style={styles.weekDay}>
            {d}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {calDays.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const key = format(day, "yyyy-MM-dd");
          const marker = dayMarkers[key];
          const selected = isSameDay(day, selectedDay);
          const todayDay = isToday(day);
          const cfg = marker ? MARKER_CFG[marker] : null;

          return (
            <Pressable
              key={i}
              style={[
                styles.dayCell,
                cfg && { backgroundColor: cfg.bg },
                selected && !todayDay && styles.dayCellSelected,
              ]}
              onPress={() => onDaySelect(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  !inMonth && styles.dayTextOtherMonth,
                  cfg && { color: cfg.tc, fontFamily: "PlusJakartaSans_600SemiBold" as any },
                  selected && !todayDay && styles.dayTextSelected,
                ]}
              >
                {format(day, "d")}
              </Text>
              {/* Colored status strip at the bottom */}
              {marker && marker !== "today" && (
                <View
                  style={[styles.statusStrip, { backgroundColor: cfg!.strip }]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {(Object.entries(MARKER_CFG) as [DayMarker, typeof MARKER_CFG[DayMarker]][]).map(
          ([key, cfg]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: cfg.bg, borderColor: cfg.strip + "80" }]} />
              <Text style={styles.legendText}>{cfg.label}</Text>
            </View>
          ),
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={T.accent} />
        </View>
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
    padding: T.sp12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp8,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 15,
    color: T.text,
    minWidth: 110,
    textAlign: "center",
  },
  todayBtn: {
    paddingHorizontal: T.sp12,
    paddingVertical: 6,
    backgroundColor: T.successBg,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.successBorder,
  },
  todayBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 12,
    color: T.success,
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.2,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
    position: "relative",
    overflow: "hidden",
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: T.accent,
  },
  dayText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.text,
  },
  dayTextOtherMonth: {
    color: T.textMuted,
    opacity: 0.35,
  },
  dayTextSelected: {
    color: T.accent,
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
  },

  // Colored status strip at the bottom of the cell
  statusStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 0,
  },

  // Legend below the grid
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: T.sp12,
    paddingTop: T.sp8,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
  },
  legendText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: T.textSec,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r12,
  },
});
