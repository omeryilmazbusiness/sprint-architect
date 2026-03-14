import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { T } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { MonthCalendar } from "@/components/manager/MonthCalendar";
import { ManagerBannerCarousel } from "@/components/managerDashboard/ManagerBannerCarousel";
import { ManagerKpiGrid } from "@/components/managerDashboard/ManagerKpiGrid";
import { ManagerQuickActions } from "@/components/managerDashboard/ManagerQuickActions";
import { ManagerTodaysAppointments } from "@/components/managerDashboard/ManagerTodaysAppointments";
import { AppointmentsTodaySheet } from "@/components/managerDashboard/AppointmentsTodaySheet";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";

interface ClinicInfo {
  id: string;
  name: string;
  status: string;
}

function SectionLabel({
  label,
  action,
  onAction,
}: {
  label: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function ManagerDashboard() {
  const { logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: clinic } = useQuery<ClinicInfo>({
    queryKey: ["/v1/manager/clinic-info"],
  });

  const { data, isLoading, isRefetching, refetch } = useManagerDashboard();

  const todayAppts = useMemo(
    () => data.todayAppointments.slice(0, 5),
    [data.todayAppointments],
  );

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.root}>
      <ManagerHeader
        title="Dashboard"
        subtitle={clinic?.name}
        onLogout={handleLogout}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={T.accent}
          />
        }
      >
        {/* Banner spans full width */}
        <ManagerBannerCarousel data={data} isLoading={isLoading} />

        {/* Padded body */}
        <View style={styles.body}>
          <SectionLabel label="Overview" />
          <ManagerKpiGrid
            data={data}
            isLoading={isLoading}
            onAppointmentsTodayPress={() => setSheetOpen(true)}
          />

          <SectionLabel label="Quick Actions" />
          <View style={styles.quickWrap}>
            <ManagerQuickActions />
          </View>

          <SectionLabel
            label="Monthly Schedule"
            action="Full Calendar"
            onAction={() => router.push("/(manager-tabs)/users")}
          />
          <MonthCalendar />

          <SectionLabel
            label="Today's Appointments"
            action={
              data.todayAppointments.length > 0
                ? `${data.todayAppointments.length} total`
                : undefined
            }
          />
          <ManagerTodaysAppointments
            appointments={todayAppts}
            isLoading={isLoading}
            total={data.todayAppointments.length}
          />
        </View>
      </ScrollView>

      {/* Bottom sheet */}
      <AppointmentsTodaySheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },

  body: {
    paddingHorizontal: T.sp16,
    paddingTop: T.sp12,
    gap: T.sp12,
  },

  quickWrap: {
    marginLeft: -T.sp16,
    paddingLeft: T.sp16,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: T.sp8,
    marginBottom: 2,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 13,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionAction: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.accent,
  },
});
