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

export default function AdminDashboard() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const {
    data: metrics,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<AdminMetrics>({
    queryKey: ["/v1/admin/metrics"],
    queryFn: getAdminMetrics,
  });

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
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
        }
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              CLINICS
            </Text>
            <View style={styles.kpiGrid}>
              <KpiTile
                label="Total" value={metrics?.clinics.total ?? 0}
                icon="business-outline" color={colors.accent} colors={colors}
                onPress={() => router.push("/(admin)/clinics")}
              />
              <KpiTile
                label="Active" value={metrics?.clinics.active ?? 0}
                icon="checkmark-circle-outline" color={colors.success} colors={colors}
                onPress={() => router.push("/(admin)/clinics")}
              />
              <KpiTile
                label="Suspended" value={metrics?.clinics.suspended ?? 0}
                icon="ban-outline" color={colors.error} colors={colors}
                onPress={() => router.push("/(admin)/clinics")}
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              INVOICES
            </Text>
            <View style={styles.kpiGrid}>
              <KpiTile
                label="Pending" value={metrics?.invoices.pending ?? 0}
                icon="time-outline" color={colors.warning} colors={colors}
                onPress={() => router.push("/(admin)/invoices")}
              />
              <KpiTile
                label="Unpaid" value={metrics?.invoices.unpaid ?? 0}
                icon="alert-circle-outline" color={colors.error} colors={colors}
                onPress={() => router.push("/(admin)/invoices")}
              />
              <KpiTile
                label="Paid" value={metrics?.invoices.paid ?? 0}
                icon="checkmark-done-outline" color={colors.success} colors={colors}
                onPress={() => router.push("/(admin)/invoices")}
              />
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
              QUICK ACTIONS
            </Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
              <NavRow icon="add-circle-outline" label="Create Clinic" sub="Add a new clinic to the platform" colors={colors} onPress={() => router.push("/(admin)/clinics/create")} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <NavRow icon="business-outline" label="View Clinics" sub="Manage all clinics" colors={colors} onPress={() => router.push("/(admin)/clinics")} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <NavRow icon="document-text-outline" label="View Invoices" sub="Billing and invoice history" colors={colors} onPress={() => router.push("/(admin)/invoices")} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <NavRow icon="people-outline" label="Manage Users" sub="Managers and accounts" colors={colors} onPress={() => router.push("/(admin)/users")} />
            </View>

            {(metrics?.recentInvoices?.length ?? 0) > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontFamily: "Inter_600SemiBold" }]}>
                  RECENT INVOICES
                </Text>
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 0 }]}>
                  {metrics!.recentInvoices.map((inv, i) => {
                    const sc = inv.status === "PAID" ? colors.success : inv.status === "UNPAID" ? colors.error : colors.warning;
                    return (
                      <React.Fragment key={inv.id}>
                        {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                        <Pressable
                          style={({ pressed }) => [styles.invRow, { opacity: pressed ? 0.7 : 1 }]}
                          onPress={() => router.push({ pathname: "/(admin)/invoices/[id]", params: { id: inv.id } })}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.invClinic, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                              {inv.clinic?.name ?? "—"}
                            </Text>
                            <Text style={[styles.invPeriod, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                              {inv.period} · {inv.currency} {inv.total.toFixed(2)}
                            </Text>
                          </View>
                          <View style={[styles.invBadge, { backgroundColor: sc + "18" }]}>
                            <Text style={[styles.invBadgeText, { color: sc, fontFamily: "Inter_600SemiBold" }]}>{inv.status}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}

        <AppFooter />
      </ScrollView>
    </View>
  );
}

function KpiTile({
  label, value, icon, color, colors, onPress,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  colors: typeof Colors.light;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.kpiTile, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.kpiIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color: colors.text, fontFamily: "Inter_700Bold" }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
    </Pressable>
  );
}

function NavRow({ icon, label, sub, colors, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; colors: typeof Colors.light; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
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
  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: { fontSize: 11, letterSpacing: 1, marginBottom: 10, marginTop: 8 },
  kpiGrid: { flexDirection: "row", gap: 10, marginBottom: 6 },
  kpiTile: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: "flex-start", gap: 4 },
  kpiIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  kpiValue: { fontSize: 24, lineHeight: 28 },
  kpiLabel: { fontSize: 12 },
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 6, overflow: "hidden" },
  divider: { height: 1 },
  navRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  navIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navLabel: { fontSize: 15 },
  navSub: { fontSize: 12, marginTop: 1 },
  invRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  invClinic: { fontSize: 14 },
  invPeriod: { fontSize: 12, marginTop: 2 },
  invBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  invBadgeText: { fontSize: 11 },
});
