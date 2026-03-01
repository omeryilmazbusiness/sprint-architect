import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow, softShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { SectionHeader } from "@/components/ui";
import { MonthCalendar } from "@/components/manager/MonthCalendar";

interface Metrics {
  totalPatients: number;
  upcomingToday: number;
  pendingDocuments: number;
  missingAssignments: number;
}

interface ClinicInfo {
  id: string;
  name: string;
  status: string;
}

function KpiCard({
  label,
  value,
  icon,
  color,
  onPress,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.kpiCard, cardShadow, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Pressable>
  );
}

export default function ManagerDashboard() {
  const { logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: clinic } = useQuery<ClinicInfo>({
    queryKey: ["/v1/manager/clinic-info"],
  });

  const {
    data: metrics,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Metrics>({
    queryKey: ["/v1/manager/metrics"],
  });

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
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
        }
      >
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={T.accent} size="large" />
          </View>
        ) : (
          <>
            <SectionHeader label="Overview" />
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Active Guests"
                value={metrics?.totalPatients ?? 0}
                icon="people-outline"
                color={T.primary}
                onPress={() => router.push("/(manager-tabs)/guests")}
              />
              <KpiCard
                label="Today"
                value={metrics?.upcomingToday ?? 0}
                icon="calendar-outline"
                color={T.accent}
              />
              <KpiCard
                label="Pending Docs"
                value={metrics?.pendingDocuments ?? 0}
                icon="document-outline"
                color={T.warning}
              />
              <KpiCard
                label="Missing Plans"
                value={metrics?.missingAssignments ?? 0}
                icon="alert-circle-outline"
                color={T.danger}
                onPress={() => router.push("/(manager-tabs)/guests")}
              />
            </View>

            <SectionHeader label="Monthly Calendar" style={styles.sectionGap} />
            <MonthCalendar />

            <SectionHeader label="Quick Actions" style={styles.sectionGap} />
            <View style={styles.quickGrid}>
              <QuickAction
                icon="person-add-outline"
                label="New Guest"
                color="#6366F1"
                onPress={() => router.push({ pathname: "/(manager-tabs)/guests", params: { openCreate: "1" } })}
              />
              <QuickAction
                icon="people-outline"
                label="View Guests"
                color={T.primary}
                onPress={() => router.push("/(manager-tabs)/guests")}
              />
              <QuickAction
                icon="layers-outline"
                label="Services"
                color={T.accent}
                onPress={() => router.push("/(manager-tabs)/services")}
              />
              <QuickAction
                icon="document-text-outline"
                label="Invoices"
                color={T.success}
                onPress={() => router.push("/(manager-tabs)/invoices")}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickCard, softShadow, { opacity: pressed ? 0.8 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.quickIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { padding: T.sp16, gap: T.sp8 },
  loader: { paddingTop: 60, alignItems: "center" },
  sectionGap: { marginTop: T.sp8 },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: "45%" as any,
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    gap: T.sp4,
    borderWidth: 1,
    borderColor: T.border,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: T.r8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: T.sp4,
  },
  kpiValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: T.text,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  emptyAppts: {
    padding: T.sp32,
    alignItems: "center",
    gap: T.sp8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
  },
  apptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  timeBox: {
    width: 52,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  timeText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 11,
    color: T.primary,
  },
  apptInfo: { flex: 1, gap: 2 },
  apptPatient: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
  },
  apptDoctor: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    flex: 1,
    minWidth: "45%" as any,
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    alignItems: "center",
    gap: T.sp8,
    borderWidth: 1,
    borderColor: T.border,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: T.r12,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.text,
    textAlign: "center",
  },
});
