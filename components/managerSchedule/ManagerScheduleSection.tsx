import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { useManagerMonthAppointments } from "@/hooks/useManagerMonthAppointments";
import {
  useScheduleDerivedData,
  type ScheduleFilter,
} from "@/hooks/useScheduleDerivedData";
import { MonthlyCalendar } from "./MonthlyCalendar";
import { DayAgendaCard } from "./DayAgendaCard";
import { NextAppointmentCard } from "./NextAppointmentCard";
import { AllScheduledListCard } from "./AllScheduledListCard";

export function ManagerScheduleSection() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [filter, setFilter] = useState<ScheduleFilter>("ALL");

  const { appointments, isLoading, isError, refetch } =
    useManagerMonthAppointments(currentMonth);

  const { dayMarkers, selectedDayAppts, nextAppointment, allScheduledGrouped } =
    useScheduleDerivedData(appointments, selectedDay, filter);

  function handleMonthChange(d: Date) {
    setCurrentMonth(d);
  }

  function handleDaySelect(d: Date) {
    setSelectedDay(d);
  }

  if (isError) {
    return (
      <View style={[styles.errorCard, cardShadow]}>
        <Ionicons name="cloud-offline-outline" size={28} color={T.danger} />
        <Text style={styles.errorTitle}>Could not load schedule</Text>
        <Pressable style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1 – Calendar */}
      <MonthlyCalendar
        currentMonth={currentMonth}
        selectedDay={selectedDay}
        dayMarkers={dayMarkers}
        isLoading={isLoading}
        onMonthChange={handleMonthChange}
        onDaySelect={handleDaySelect}
      />

      {/* 2A – Day Agenda */}
      <DayAgendaCard
        selectedDay={selectedDay}
        appointments={selectedDayAppts}
        isLoading={isLoading}
      />

      {/* 2B – Next Appointment */}
      <NextAppointmentCard
        appointment={nextAppointment}
        isLoading={isLoading}
      />

      {/* 2C – All Scheduled */}
      <AllScheduledListCard
        groups={allScheduledGrouped}
        isLoading={isLoading}
        filter={filter}
        onFilterChange={setFilter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  errorCard: {
    backgroundColor: T.dangerBg,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.dangerBorder,
    padding: T.sp24,
    alignItems: "center",
    gap: T.sp12,
  },
  errorTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 14,
    color: T.danger,
  },
  retryBtn: {
    paddingHorizontal: T.sp20,
    paddingVertical: T.sp8,
    backgroundColor: T.danger,
    borderRadius: T.r8,
  },
  retryText: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 13,
    color: "#fff",
  },
});
