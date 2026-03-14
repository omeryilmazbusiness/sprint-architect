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

  function getDayStyle(day: Date) {
    const key = format(day, "yyyy-MM-dd");
    const marker = dayMarkers[key];
    const selected = isSameDay(day, selectedDay);
    const today = isToday(day);

    if (today) return { cell: styles.cellToday, text: styles.textToday };
    if (selected)
      return { cell: styles.cellSelected, text: styles.textSelected };
    if (marker === "upcoming")
      return { cell: styles.cellUpcoming, text: styles.textUpcoming };
    if (marker === "pastDone")
      return { cell: styles.cellPastDone, text: styles.textPastDone };
    return { cell: null, text: null };
  }

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

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: T.success }]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: T.successBg, borderColor: T.successBorder, borderWidth: 1 }]}
          />
          <Text style={styles.legendText}>Upcoming</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: T.surfaceSubtle, borderColor: T.border, borderWidth: 1 }]}
          />
          <Text style={styles.legendText}>Completed</Text>
        </View>
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
          const { cell, text } = getDayStyle(day);
          const key = format(day, "yyyy-MM-dd");
          const marker = dayMarkers[key];
          const hasAppts = !!marker && marker !== "today" && !isToday(day);

          return (
            <Pressable
              key={i}
              style={[styles.dayCell, cell]}
              onPress={() => onDaySelect(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  !inMonth && styles.dayTextOtherMonth,
                  text,
                ]}
              >
                {format(day, "d")}
              </Text>
              {hasAppts && (
                <View
                  style={[
                    styles.apptDot,
                    marker === "upcoming"
                      ? styles.dotUpcoming
                      : styles.dotPastDone,
                  ]}
                />
              )}
            </Pressable>
          );
        })}
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
    fontFamily: "Inter_600SemiBold" as any,
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
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 12,
    color: T.success,
  },

  legend: {
    flexDirection: "row",
    gap: T.sp12,
    marginBottom: T.sp8,
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
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
    gap: 2,
  },
  dayText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.text,
  },
  dayTextOtherMonth: {
    color: T.textMuted,
    opacity: 0.35,
  },

  // Day states
  cellToday: {
    backgroundColor: T.success,
  },
  textToday: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: T.accent,
  },
  textSelected: {
    color: T.accent,
    fontFamily: "Inter_600SemiBold" as any,
  },
  cellUpcoming: {
    backgroundColor: T.successBg,
  },
  textUpcoming: {
    color: T.success,
    fontFamily: "Inter_500Medium",
  },
  cellPastDone: {
    backgroundColor: T.surfaceSubtle,
  },
  textPastDone: {
    color: T.textMuted,
  },

  apptDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotUpcoming: { backgroundColor: T.success },
  dotPastDone: { backgroundColor: T.textMuted },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r12,
  },
});
