import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/constants/adminTheme";
import { useGuestDashboard } from "@/hooks/guest/useGuestDashboard";
import { useGuestAgenda } from "@/hooks/guest/useGuestAgenda";
import { ErrorView } from "@/components/ErrorView";
import { GuestHeader } from "@/components/guestDashboard/GuestHeader";
import { GuestBannerCarousel } from "@/components/guestDashboard/GuestBannerCarousel";
import { GuestDashboardSkeleton } from "@/components/guestDashboard/GuestDashboardSkeleton";
import { TodayAppointmentCard } from "@/components/guestDashboard/TodayAppointmentCard";
import { AppointmentsCalendar } from "@/components/guestDashboard/AppointmentsCalendar";
import { AgendaTabs } from "@/components/guestDashboard/AgendaTabs";
import { SectionLabel } from "@/components/guestDashboard/SectionLabel";
import { SupportCard } from "@/components/guestDashboard/SupportCard";
import { OverviewSliderRow } from "@/components/guestDashboard/OverviewSliderRow";
import { DoctorProfileCard } from "@/components/guestDashboard/DoctorProfileCard";
import { Ionicons } from "@expo/vector-icons";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function PatientDashboard() {
  const { logout } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();

  const {
    isLoading,
    isError,
    isRefetching,
    refetch,
    patient,
    transport,
    hotel,
    appointments,
    doctors,
    documents,
  } = useGuestDashboard();

  const agenda = useGuestAgenda(appointments);

  const todayAppointment = useMemo(() => {
    const today = new Date();
    return (
      appointments.find(
        (a) => isSameDay(new Date(a.startAt), today) && a.status !== "CANCELLED"
      ) ?? null
    );
  }, [appointments]);

  if (isLoading) return <GuestDashboardSkeleton />;
  if (isError) return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <GuestHeader patientName={patient?.fullName} onLogout={logout} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={T.accent}
          />
        }
      >
        {/* Banner */}
        <View style={styles.bannerSection}>
          <GuestBannerCarousel />
        </View>

        {/* Overview slider: Transport / Hotel / Documents */}
        <View style={styles.section}>
          <SectionLabel text="Overview" />
          <OverviewSliderRow
            transport={transport}
            hotel={hotel}
            documents={documents}
          />
        </View>

        {/* Today appointment */}
        {todayAppointment ? (
          <View style={styles.section}>
            <TodayAppointmentCard appointment={todayAppointment} />
          </View>
        ) : null}

        {/* Calendar + Agenda */}
        <View style={styles.section}>
          <SectionLabel text="Schedule" />
          <AppointmentsCalendar
            days={agenda.calendarDays}
            monthLabel={agenda.monthLabel}
            selectedDate={agenda.selectedDate}
            onSelectDay={agenda.setSelectedDate}
            onPrev={agenda.prevMonth}
            onNext={agenda.nextMonth}
          />
          <AgendaTabs
            todayList={agenda.todayList}
            upcomingList={agenda.upcomingList}
            completedList={agenda.completedList}
          />
        </View>

        {/* Doctors slider */}
        <View style={styles.section}>
          <SectionLabel text="Doctors" />
          {doctors.length === 0 ? (
            <View style={styles.emptyDoctors}>
              <Ionicons name="people-outline" size={32} color={T.textMuted} />
              <Text style={styles.emptyDoctorsText}>
                Doctors will appear here once your clinic adds them.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.doctorsScroll}
              style={styles.doctorsList}
            >
              {doctors.map((doc) => (
                <DoctorProfileCard key={doc.id} doctor={doc} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Support */}
        <View style={styles.section}>
          <SupportCard />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    paddingTop: T.sp16,
  },
  bannerSection: {
    marginBottom: T.sp4,
  },
  section: {
    paddingHorizontal: T.sp16,
    marginBottom: T.sp16,
  },
  doctorsList: {
    marginHorizontal: -T.sp16,
  },
  doctorsScroll: {
    paddingHorizontal: T.sp16,
    gap: 12,
    paddingBottom: 4,
  },
  emptyDoctors: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp24,
    alignItems: "center",
    gap: T.sp8,
  },
  emptyDoctorsText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
