import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
  Platform,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { StatusBadge } from "@/components/StatusBadge";
import { getAdminMetrics, AdminMetrics } from "@/lib/api/adminInvoices";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

export default function AdminDashboard() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
    isRefetching,
  } = useQuery<AdminMetrics>({
    queryKey: ["/v1/admin/metrics"],
    queryFn: getAdminMetrics,
  });

  const { data: clinicsData, isLoading: clinicsLoading, refetch: refetchClinics } =
    useQuery<ClinicListResponse>({
      queryKey: ["/v1/admin/clinics", { pageSize: 6 }],
      queryFn: () => listClinics({ pageSize: 6 }),
    });

  const isLoading = metricsLoading || clinicsLoading;

  async function handleRefresh() {
    await Promise.all([refetchMetrics(), refetchClinics()]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Admin Dashboard"
        subtitle="HealthTour Operations"
        userEmail={user?.email}
        userRole={user?.role}
        onLogout={logout}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {metrics && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                  OVERVIEW
                </Text>
                <View style={styles.metricsRow}>
                  <MetricTile
                    label="Clinics"
                    value={metrics.clinics.total}
                    sub={`${metrics.clinics.active} active`}
                    icon="business-outline"
                    color={colors.accent}
                    colors={colors}
                  />
                  <MetricTile
                    label="Users"
                    value={metrics.users.active}
                    sub="active"
                    icon="people-outline"
                    color={colors.success}
                    colors={colors}
                  />
                  <MetricTile
                    label="Invoices"
                    value={metrics.invoices.issued}
                    sub="issued"
                    icon="document-text-outline"
                    color={colors.warning}
                    colors={colors}
                  />
                </View>
              </>
            )}

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              CLINICS
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
                    {metrics?.clinics.total ?? "–"} Total Clinics
                  </Text>
                  <Text style={[styles.cardSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                    {metrics?.clinics.active ?? 0} active · {metrics?.clinics.suspended ?? 0} suspended
                  </Text>
                </View>
                <Pressable
                  style={[styles.createBtn, { backgroundColor: colors.accent }]}
                  onPress={() => router.push("/(admin)/clinics/create")}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={[styles.createBtnText, { fontFamily: "Inter_600SemiBold" }]}>Create</Text>
                </Pressable>
              </View>

              {(clinicsData?.rows.length ?? 0) > 0 ? (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  {clinicsData!.rows.map((clinic, idx) => (
                    <React.Fragment key={clinic.id}>
                      <Pressable
                        style={({ pressed }) => [styles.clinicRow, { opacity: pressed ? 0.7 : 1 }]}
                        onPress={() => router.push(`/(admin)/clinics/${clinic.id}`)}
                      >
                        <View style={[styles.clinicIcon, { backgroundColor: colors.accent + "18" }]}>
                          <Ionicons name="business-outline" size={16} color={colors.accent} />
                        </View>
                        <Text
                          style={[styles.clinicName, { color: colors.text, fontFamily: "Inter_500Medium" }]}
                          numberOfLines={1}
                        >
                          {clinic.name}
                        </Text>
                        <StatusBadge status={clinic.status} />
                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                      </Pressable>
                      {idx < clinicsData!.rows.length - 1 && (
                        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
                      )}
                    </React.Fragment>
                  ))}
                  {(clinicsData?.total ?? 0) > 6 && (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <Pressable
                        style={({ pressed }) => [styles.viewAllRow, { opacity: pressed ? 0.7 : 1 }]}
                        onPress={() => router.push("/(admin)/clinics")}
                      >
                        <Text style={[styles.viewAllText, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
                          View all {clinicsData!.total} clinics
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color={colors.accent} />
                      </Pressable>
                    </>
                  )}
                </>
              ) : (
                <View style={styles.emptyHint}>
                  <Text style={[styles.emptyHintText, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                    No clinics yet. Create one to get started.
                  </Text>
                </View>
              )}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              MANAGE
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
              <NavRow
                icon="people-outline"
                label="Users"
                sub="Manage managers and accounts"
                colors={colors}
                onPress={() => router.push("/(admin)/users")}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <NavRow
                icon="document-text-outline"
                label="Invoices"
                sub="Billing and invoice history"
                colors={colors}
                onPress={() => router.push("/(admin)/invoices")}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <NavRow
                icon="settings-outline"
                label="Settings"
                sub="App and account settings"
                colors={colors}
                onPress={() => router.push("/(admin)/settings")}
              />
            </View>
          </>
        )}

        <AppFooter />
      </ScrollView>
    </View>
  );
}

function MetricTile({
  label, value, sub, icon, color, colors,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      {sub ? (
        <Text style={[styles.metricSub, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>{sub}</Text>
      ) : null}
    </View>
  );
}

function NavRow({
  icon, label, sub, colors, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.navIcon, { backgroundColor: colors.accent + "18" }]}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.navLabel, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{label}</Text>
        <Text style={[styles.navSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  metricTile: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 4,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  metricValue: { fontSize: 24, lineHeight: 28 },
  metricLabel: { fontSize: 12 },
  metricSub: { fontSize: 10 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 17 },
  cardSub: { fontSize: 12, marginTop: 2 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    flexShrink: 0,
  },
  createBtnText: { fontSize: 14, color: "#fff" },
  divider: { height: 1 },
  clinicRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  clinicIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  clinicName: { flex: 1, fontSize: 14 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    gap: 6,
  },
  viewAllText: { fontSize: 14 },
  emptyHint: { paddingHorizontal: 16, paddingBottom: 16 },
  emptyHintText: { fontSize: 13 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  navLabel: { fontSize: 15 },
  navSub: { fontSize: 12, marginTop: 1 },
});
