import React, { useMemo } from "react";
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
import { format, startOfDay, endOfDay } from "date-fns";
import { T, cardShadow, softShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { MonthCalendar } from "@/components/manager/MonthCalendar";
import { StatusPill, Divider } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";

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

interface Appointment {
  id: string;
  title: string;
  startAt: string;
  status: string;
  patient?: { id: string; fullName: string };
  doctor?: { id: string; fullName: string } | null;
}

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  status: string;
}

function KpiCard({
  label,
  value,
  icon,
  color,
  subtitle,
  onPress,
}: {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.kpiCard, cardShadow, { opacity: pressed ? 0.82 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: color + "14" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {subtitle ? <Text style={styles.kpiSub}>{subtitle}</Text> : null}
    </Pressable>
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
      <View style={[styles.quickIcon, { backgroundColor: color + "16" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionLabel({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TodayApptRow({ appt }: { appt: Appointment }) {
  const time = format(new Date(appt.startAt), "HH:mm");
  return (
    <Pressable
      style={styles.focusRow}
      onPress={() => appt.patient && router.push({ pathname: "/(manager)/patients/[id]", params: { id: appt.patient.id } })}
    >
      <View style={styles.focusTimeBox}>
        <Text style={styles.focusTimeText}>{time}</Text>
      </View>
      <View style={styles.focusInfo}>
        <Text style={styles.focusName} numberOfLines={1}>{appt.patient?.fullName ?? "Guest"}</Text>
        <Text style={styles.focusSub} numberOfLines={1}>{appt.title}{appt.doctor ? ` · ${appt.doctor.fullName}` : ""}</Text>
      </View>
      <StatusPill status={appt.status} />
    </Pressable>
  );
}

function PendingDocRow({ patient }: { patient: Patient }) {
  return (
    <Pressable
      style={styles.focusRow}
      onPress={() => router.push({ pathname: "/(manager)/patients/[id]", params: { id: patient.id } })}
    >
      <View style={[styles.focusTimeBox, { backgroundColor: T.warningBg }]}>
        <Ionicons name="document-outline" size={16} color={T.warning} />
      </View>
      <View style={styles.focusInfo}>
        <Text style={styles.focusName} numberOfLines={1}>{patient.fullName}</Text>
        <Text style={styles.focusSub}>{patient.patientKey}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
    </Pressable>
  );
}

export default function ManagerDashboard() {
  const { logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const todayFrom = format(startOfDay(new Date()), "yyyy-MM-dd");
  const todayTo = format(endOfDay(new Date()), "yyyy-MM-dd");

  const { data: clinic } = useQuery<ClinicInfo>({
    queryKey: ["/v1/manager/clinic-info"],
  });

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
    isRefetching,
  } = useQuery<Metrics>({
    queryKey: ["/v1/manager/metrics"],
  });

  const { data: todayAppts, isLoading: todayLoading } = useQuery<Appointment[]>({
    queryKey: ["/v1/manager/appointments", "today", todayFrom],
    queryFn: async () => {
      const res = await apiRequest("GET", `/v1/manager/appointments?from=${todayFrom}&to=${todayTo}`);
      return res.json();
    },
  });

  const { data: pendingPatientsData } = useQuery<{ rows: Patient[] }>({
    queryKey: ["/v1/manager/patients", "pendingDocs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/v1/manager/patients?missing=missingDocuments&pageSize=5");
      return res.json();
    },
  });

  const todayApptsSorted = useMemo(() => {
    if (!todayAppts) return [];
    return [...todayAppts].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()).slice(0, 5);
  }, [todayAppts]);

  const pendingPatients = pendingPatientsData?.rows?.slice(0, 5) ?? [];

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const isLoading = metricsLoading;

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
          <RefreshControl refreshing={isRefetching} onRefresh={refetchMetrics} tintColor={T.accent} />
        }
      >
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={T.accent} size="large" />
          </View>
        ) : (
          <>
            <SectionLabel label="Overview" />
            <View style={styles.kpiGrid}>
              <KpiCard
                label="Active Guests"
                value={metrics?.totalPatients ?? 0}
                icon="people-outline"
                color={T.primary}
                subtitle="updated just now"
                onPress={() => router.push("/(manager-tabs)/users")}
              />
              <KpiCard
                label="Appts Today"
                value={metrics?.upcomingToday ?? 0}
                icon="calendar-outline"
                color={T.accent}
                subtitle="scheduled"
              />
              <KpiCard
                label="Pending Docs"
                value={metrics?.pendingDocuments ?? 0}
                icon="document-outline"
                color={T.warning}
                subtitle="awaiting upload"
                onPress={() => router.push("/(manager-tabs)/users")}
              />
              <KpiCard
                label="Missing Plans"
                value={metrics?.missingAssignments ?? 0}
                icon="alert-circle-outline"
                color={T.danger}
                subtitle="incomplete"
                onPress={() => router.push("/(manager-tabs)/users")}
              />
            </View>

            <SectionLabel label="Quick Actions" />
            <View style={styles.quickGrid}>
              <QuickAction
                icon="person-add-outline"
                label="New Guest"
                color="#6366F1"
                onPress={() => router.push({ pathname: "/(manager-tabs)/users", params: { openCreate: "1" } })}
              />
              <QuickAction
                icon="calendar-outline"
                label="Schedule"
                color={T.accent}
                onPress={() => {}}
              />
              <QuickAction
                icon="people-outline"
                label="View Users"
                color={T.primary}
                onPress={() => router.push("/(manager-tabs)/users")}
              />
              <QuickAction
                icon="layers-outline"
                label="Services"
                color={T.success}
                onPress={() => router.push("/(manager-tabs)/services")}
              />
            </View>

            <SectionLabel
              label="Monthly Schedule"
              action="View All"
              onAction={() => router.push("/(manager-tabs)/users")}
            />
            <MonthCalendar />

            <SectionLabel
              label="Today's Appointments"
              action={todayApptsSorted.length > 0 ? `${todayApptsSorted.length} total` : undefined}
            />
            <View style={[styles.focusCard, cardShadow]}>
              {todayLoading ? (
                <View style={styles.focusEmpty}>
                  <ActivityIndicator size="small" color={T.accent} />
                </View>
              ) : todayApptsSorted.length === 0 ? (
                <View style={styles.focusEmpty}>
                  <Ionicons name="calendar-outline" size={28} color={T.border} />
                  <Text style={styles.focusEmptyText}>No appointments scheduled for today</Text>
                </View>
              ) : (
                todayApptsSorted.map((appt, i) => (
                  <React.Fragment key={appt.id}>
                    {i > 0 && <Divider />}
                    <TodayApptRow appt={appt} />
                  </React.Fragment>
                ))
              )}
            </View>

            <SectionLabel
              label="Documents Pending"
              action={pendingPatients.length > 0 ? "View all" : undefined}
              onAction={() => router.push("/(manager-tabs)/users")}
            />
            <View style={[styles.focusCard, cardShadow]}>
              {pendingPatients.length === 0 ? (
                <View style={styles.focusEmpty}>
                  <Ionicons name="checkmark-circle-outline" size={28} color={T.success} />
                  <Text style={styles.focusEmptyText}>No pending document uploads</Text>
                </View>
              ) : (
                pendingPatients.map((patient, i) => (
                  <React.Fragment key={patient.id}>
                    {i > 0 && <Divider />}
                    <PendingDocRow patient={patient} />
                  </React.Fragment>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { padding: T.sp16, gap: T.sp12 },
  loader: { paddingTop: 60, alignItems: "center" },

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
    gap: 3,
    borderWidth: 1,
    borderColor: T.border,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: T.r8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: T.sp8,
  },
  kpiValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: T.text,
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 12,
    color: T.text,
  },
  kpiSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
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

  focusCard: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  focusEmpty: {
    padding: T.sp24,
    alignItems: "center",
    gap: T.sp8,
  },
  focusEmptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
    textAlign: "center",
  },
  focusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp12,
  },
  focusTimeBox: {
    width: 46,
    height: 36,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },
  focusTimeText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 11,
    color: T.accent,
  },
  focusInfo: {
    flex: 1,
    gap: 2,
  },
  focusName: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
  },
  focusSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
});
