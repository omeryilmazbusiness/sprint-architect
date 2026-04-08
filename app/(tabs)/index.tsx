import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Platform,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/context/AuthContext";
import Colors from "@/constants/colors";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";

interface Metrics {
  totalPatients: number;
  upcomingToday: number;
  pendingDocuments: number;
}

interface UpcomingAppointment {
  id: string;
  patient: { fullName: string };
  doctor?: { name: string } | null;
  type: string;
  startAt: string;
  status: string;
}

interface HealthData {
  status: string;
  time: string;
  version: string;
  service: string;
  environment: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["/api/health"],
  });

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch,
    isRefetching,
  } = useQuery<Metrics>({ queryKey: ["/v1/manager/metrics"] });

  const { data: appointments } = useQuery<UpcomingAppointment[]>({
    queryKey: ["/v1/manager/upcoming-appointments"],
  });

  const topPad =
    Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.primary, isDark ? "#00B4D8" : "#1A5276"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: topPad + 16 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.greeting, { fontFamily: "PlusJakartaSans_400Regular" }]}>
              Good morning,
            </Text>
            <Text style={[styles.adminName, { fontFamily: "PlusJakartaSans_700Bold" }]}>
              {user?.fullName ?? "Admin"}
            </Text>
          </View>
          <View
            style={[
              styles.apiStatus,
              {
                backgroundColor: health?.status === "ok"
                  ? colors.success + "30"
                  : "#EF444430",
              },
            ]}
          >
            <View
              style={[
                styles.apiDot,
                {
                  backgroundColor:
                    healthLoading
                      ? colors.warning
                      : health?.status === "ok"
                      ? colors.success
                      : colors.error,
                },
              ]}
            />
            <Text style={[styles.apiText, { fontFamily: "PlusJakartaSans_500Medium" }]}>
              {healthLoading ? "Checking..." : health?.status === "ok" ? "API Online" : "API Offline"}
            </Text>
          </View>
        </View>

        <View style={styles.headerStat}>
          <Text style={[styles.bigValue, { fontFamily: "PlusJakartaSans_700Bold" }]}>
            {metricsLoading ? "—" : metrics?.totalPatients ?? "—"}
          </Text>
          <Text style={[styles.bigLabel, { fontFamily: "PlusJakartaSans_400Regular" }]}>
            Total Patients Across All Clinics
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold" },
          ]}
        >
          Key Metrics
        </Text>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Today's Appointments"
            value={metricsLoading ? "—" : metrics?.upcomingToday ?? "—"}
            icon="calendar-outline"
            accent={colors.warning}
          />
          <MetricCard
            label="Pending Documents"
            value={metricsLoading ? "—" : metrics?.pendingDocuments ?? "—"}
            icon="document-text-outline"
            accent={colors.accent}
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 8 },
          ]}
        >
          Upcoming Appointments
        </Text>

        {!appointments || appointments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: "PlusJakartaSans_400Regular" }]}>
              No upcoming appointments
            </Text>
          </View>
        ) : (
          appointments.map((apt) => (
            <Pressable
              key={apt.id}
              style={({ pressed }) => [
                styles.aptCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.aptTime, { backgroundColor: colors.accent + "15" }]}>
                <Text style={[styles.aptTimeText, { color: colors.accent, fontFamily: "PlusJakartaSans_700Bold" }]}>
                  {formatDate(apt.startAt)}
                </Text>
              </View>
              <View style={styles.aptInfo}>
                <Text style={[styles.aptPatient, { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
                  {apt.patient.fullName}
                </Text>
                <Text style={[styles.aptType, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
                  {apt.type}{apt.doctor ? ` · ${apt.doctor.name}` : ""}
                </Text>
              </View>
              <StatusBadge status={apt.status as any} small />
            </Pressable>
          ))
        )}

        {health && (
          <View style={[styles.apiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.apiCardHeader}>
              <Ionicons name="server-outline" size={16} color={colors.accent} />
              <Text style={[styles.apiCardTitle, { color: colors.text, fontFamily: "PlusJakartaSans_600SemiBold" }]}>
                System Status
              </Text>
            </View>
            <View style={styles.apiRow}>
              <Text style={[styles.apiKey, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>Service</Text>
              <Text style={[styles.apiVal, { color: colors.text, fontFamily: "PlusJakartaSans_500Medium" }]}>{health.service}</Text>
            </View>
            <View style={styles.apiRow}>
              <Text style={[styles.apiKey, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>Version</Text>
              <Text style={[styles.apiVal, { color: colors.text, fontFamily: "PlusJakartaSans_500Medium" }]}>v{health.version}</Text>
            </View>
            <View style={styles.apiRow}>
              <Text style={[styles.apiKey, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>Environment</Text>
              <Text style={[styles.apiVal, { color: colors.text, fontFamily: "PlusJakartaSans_500Medium" }]}>{health.environment}</Text>
            </View>
            <View style={styles.apiRow}>
              <Text style={[styles.apiKey, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>Last Check</Text>
              <Text style={[styles.apiVal, { color: colors.success, fontFamily: "PlusJakartaSans_500Medium" }]}>
                {formatDate(health.time)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  adminName: {
    fontSize: 22,
    color: "#fff",
  },
  apiStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  apiDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  apiText: {
    fontSize: 12,
    color: "#fff",
  },
  headerStat: {
    gap: 4,
  },
  bigValue: {
    fontSize: 48,
    color: "#fff",
    lineHeight: 52,
  },
  bigLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },
  body: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  aptCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  aptTime: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 52,
  },
  aptTimeText: {
    fontSize: 14,
  },
  aptInfo: {
    flex: 1,
    gap: 2,
  },
  aptPatient: {
    fontSize: 15,
  },
  aptType: {
    fontSize: 12,
  },
  apiCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 4,
  },
  apiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  apiCardTitle: {
    fontSize: 15,
  },
  apiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  apiKey: {
    fontSize: 13,
  },
  apiVal: {
    fontSize: 13,
  },
});
