import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useTabBarMetrics } from "@/components/layout/TabBarMetricsContext";
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
import { OverviewTileCarousel } from "@/components/guestDashboard/OverviewTileCarousel";
import { DoctorsCarousel } from "@/components/guestDashboard/DoctorsCarousel";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function PatientDashboard() {
  const { logout } = useAuth();
  const { bottomPadding: tabBarHeight } = useTabBarMetrics();

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

        {/* Overview carousel: Transport / Hotel / Documents */}
        <View style={styles.section}>
          <SectionLabel text="Overview" />
          <OverviewTileCarousel
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

        {/* Doctors carousel */}
        <View style={styles.section}>
          <SectionLabel text="Doctors" />
          <DoctorsCarousel doctors={doctors} />
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
});
