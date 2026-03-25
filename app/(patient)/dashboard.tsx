import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { T } from "@/constants/adminTheme";
import { useGuestDashboard } from "@/hooks/guest/useGuestDashboard";
import { useGuestAgenda } from "@/hooks/guest/useGuestAgenda";
import { GuestBannerCarousel } from "@/components/guestDashboard/GuestBannerCarousel";
import { TransportCard } from "@/components/guestDashboard/TransportCard";
import { HotelCard } from "@/components/guestDashboard/HotelCard";
import { TodayAppointmentCard } from "@/components/guestDashboard/TodayAppointmentCard";
import { DocumentsCard } from "@/components/guestDashboard/DocumentsCard";
import { AppointmentsCalendar } from "@/components/guestDashboard/AppointmentsCalendar";
import { AgendaTabs } from "@/components/guestDashboard/AgendaTabs";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function PatientDashboard() {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const { isLoading, isError, isRefetching, refetch, patient, transport, hotel, appointments, documents } =
    useGuestDashboard();

  const agenda = useGuestAgenda(appointments);

  const todayAppointment = useMemo(() => {
    const today = new Date();
    return (
      appointments.find(
        (a) => isSameDay(new Date(a.startAt), today) && a.status !== "CANCELLED"
      ) ?? null
    );
  }, [appointments]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = tabBarHeight + 24;

  if (isLoading) return <LoadingView />;
  if (isError) return <ErrorView onRetry={refetch} />;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={T.accent}
          />
        }
      >
        {/* ── HEADER ── */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.patientName} numberOfLines={1}>
              {patient?.fullName ?? ""}
            </Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutBtn} hitSlop={8}>
            <Ionicons name="log-out-outline" size={22} color={T.textSec} />
          </Pressable>
        </View>

        {/* ── BANNER CAROUSEL ── */}
        <GuestBannerCarousel />

        {/* ── OVERVIEW CARDS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <TransportCard transport={transport} />
          <HotelCard hotel={hotel} />
          <TodayAppointmentCard appointment={todayAppointment} />
          <DocumentsCard documents={documents} />
        </View>

        {/* ── CALENDAR ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointments</Text>
          <AppointmentsCalendar
            days={agenda.calendarDays}
            monthLabel={agenda.monthLabel}
            selectedDate={agenda.selectedDate}
            onSelectDay={agenda.setSelectedDate}
            onPrev={agenda.prevMonth}
            onNext={agenda.nextMonth}
          />

          {/* ── AGENDA TABS ── */}
          <AgendaTabs
            todayList={agenda.todayList}
            upcomingList={agenda.upcomingList}
            completedList={agenda.completedList}
          />
        </View>

        {/* ── SUPPORT CARD ── */}
        <View style={styles.section}>
          <View style={styles.supportCard}>
            <Ionicons name="headset-outline" size={22} color={T.accent} />
            <View style={styles.supportText}>
              <Text style={styles.supportTitle}>Need help?</Text>
              <Text style={styles.supportSub}>Contact your clinic coordinator for any questions.</Text>
            </View>
          </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp20,
    paddingBottom: T.sp16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    marginBottom: T.sp16,
    ...(Platform.OS === "web"
      ? {}
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
        }),
  },
  greeting: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    marginBottom: 2,
  },
  patientName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: T.text,
    maxWidth: 250,
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  section: {
    paddingHorizontal: T.sp16,
    marginBottom: T.sp8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    marginBottom: T.sp12,
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  supportText: { flex: 1 },
  supportTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
    marginBottom: 2,
  },
  supportSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 18,
  },
});
