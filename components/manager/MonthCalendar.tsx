import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";
import { T, cardShadow } from "@/constants/adminTheme";
import { Card, Divider, StatusPill } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";

interface Appointment {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  status: string;
  patient?: { id: string; fullName: string };
  doctor?: { name: string } | null;
}

export function MonthCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const fromStr = format(monthStart, "yyyy-MM-dd");
  const toStr = format(monthEnd, "yyyy-MM-dd");

  const { data: monthAppointments, isLoading: isLoadingMonth } = useQuery<Appointment[]>({
    queryKey: ["/v1/manager/appointments", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const res = await apiRequest("GET", `/v1/manager/appointments?from=${fromStr}&to=${toStr}`);
      return res.json();
    },
  });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  const selectedDayAppointments = useMemo(() => {
    if (!monthAppointments) return [];
    return monthAppointments.filter((appt) =>
      isSameDay(parseISO(appt.startAt), selectedDate)
    );
  }, [monthAppointments, selectedDate]);

  const hasAppointments = (day: Date) => {
    if (!monthAppointments) return false;
    return monthAppointments.some((appt) => isSameDay(parseISO(appt.startAt), day));
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.header}>
        <View style={styles.monthNav}>
          <Pressable onPress={handlePrevMonth} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={T.primary} />
          </Pressable>
          <Text style={styles.monthTitle}>{format(currentMonth, "MMMM yyyy")}</Text>
          <Pressable onPress={handleNextMonth} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={T.primary} />
          </Pressable>
        </View>
        <Pressable onPress={handleToday} style={styles.todayBtn}>
          <Text style={styles.todayBtnText}>Today</Text>
        </Pressable>
      </View>

      {/* Calendar Grid */}
      <Card style={styles.calendarCard}>
        <View style={styles.weekHeader}>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <Text key={i} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {calendarDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDay = isToday(day);
            const hasAppts = hasAppointments(day);

            return (
              <Pressable
                key={i}
                style={[
                  styles.dayCell,
                  isSelected && styles.selectedDayCell,
                  isTodayDay && !isSelected && styles.todayDayCell,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text
                  style={[
                    styles.dayText,
                    !isCurrentMonth && styles.notCurrentMonthText,
                    isSelected && styles.selectedDayText,
                    isTodayDay && !isSelected && styles.todayDayText,
                  ]}
                >
                  {format(day, "d")}
                </Text>
                {hasAppts && (
                  <View
                    style={[
                      styles.dot,
                      isSelected ? styles.selectedDot : styles.unselectedDot,
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
        {isLoadingMonth && (
          <View style={styles.gridOverlay}>
            <ActivityIndicator color={T.accent} />
          </View>
        )}
      </Card>

      {/* Agenda */}
      <View style={styles.agendaHeader}>
        <Text style={styles.agendaTitle}>
          Schedule for {format(selectedDate, "MMMM d")}
        </Text>
      </View>

      <Card noPad style={styles.agendaCard}>
        {selectedDayAppointments.length === 0 ? (
          <View style={styles.emptyAgenda}>
            <Text style={styles.emptyText}>No appointments on this day.</Text>
          </View>
        ) : (
          selectedDayAppointments.map((appt, i) => (
            <React.Fragment key={appt.id}>
              {i > 0 && <Divider inset={64} />}
              <Pressable
                style={({ pressed }) => [
                  styles.apptRow,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  if (appt.patient?.id) {
                    router.push({
                      pathname: "/(manager)/patients/[id]",
                      params: { id: appt.patient.id },
                    });
                  }
                }}
              >
                <View style={styles.timeBox}>
                  <Text style={styles.timeText}>
                    {format(parseISO(appt.startAt), "HH:mm")}
                  </Text>
                </View>
                <View style={styles.apptInfo}>
                  <Text style={styles.apptTitle} numberOfLines={1}>
                    {appt.title || appt.type}
                  </Text>
                  <Text style={styles.apptPatient} numberOfLines={1}>
                    {appt.patient?.fullName ?? "—"}
                  </Text>
                  {appt.doctor && (
                    <Text style={styles.apptDoctor} numberOfLines={1}>
                      Dr. {appt.doctor.fullName}
                    </Text>
                  )}
                </View>
                <StatusPill status={appt.status} small />
              </Pressable>
            </React.Fragment>
          ))
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: T.sp12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: T.sp4,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  navBtn: {
    padding: 4,
  },
  monthTitle: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 16,
    color: T.text,
    minWidth: 120,
    textAlign: "center",
  },
  todayBtn: {
    paddingHorizontal: T.sp12,
    paddingVertical: 6,
    backgroundColor: T.surface,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
  },
  todayBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.primary,
  },
  calendarCard: {
    padding: T.sp8,
    position: "relative",
  },
  weekHeader: {
    flexDirection: "row",
    marginBottom: T.sp8,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textMuted,
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
  selectedDayCell: {
    backgroundColor: T.primary,
  },
  todayDayCell: {
    borderWidth: 1,
    borderColor: T.primary,
  },
  dayText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
  },
  notCurrentMonthText: {
    color: T.textMuted,
    opacity: 0.4,
  },
  selectedDayText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold" as any,
  },
  todayDayText: {
    color: T.primary,
    fontFamily: "Inter_600SemiBold" as any,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  selectedDot: {
    backgroundColor: "#fff",
  },
  unselectedDot: {
    backgroundColor: T.accent,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r12,
  },
  agendaHeader: {
    marginTop: T.sp8,
  },
  agendaTitle: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 15,
    color: T.text,
  },
  agendaCard: {
    marginBottom: T.sp24,
  },
  emptyAgenda: {
    padding: T.sp24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
  apptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  timeBox: {
    width: 48,
    paddingVertical: 4,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  timeText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 11,
    color: T.primary,
  },
  apptInfo: { flex: 1, gap: 1 },
  apptTitle: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
  },
  apptPatient: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.text,
  },
  apptDoctor: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },
});
