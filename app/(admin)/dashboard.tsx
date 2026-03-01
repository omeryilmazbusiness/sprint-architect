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
import { T, cardShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, SectionHeader, StatusPill, Divider } from "@/components/ui";
import { getAdminMetrics, AdminMetrics } from "@/lib/api/adminInvoices";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch, isRefetching } = useQuery<AdminMetrics>({
    queryKey: ["/v1/admin/metrics"],
    queryFn: getAdminMetrics,
  });

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.root}>
      <AdminHeader
        title="Dashboard"
        userEmail={user?.email}
        onLogout={handleLogout}
        showBell
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
            <SectionHeader label="Clinics" />
            <View style={styles.kpiGrid}>
              <KpiCard label="Total" value={data?.clinics.total ?? 0} icon="business-outline" color={T.primary} onPress={() => router.push("/(admin)/clinics")} />
              <KpiCard label="Active" value={data?.clinics.active ?? 0} icon="checkmark-circle-outline" color={T.success} onPress={() => router.push("/(admin)/clinics")} />
              <KpiCard label="Suspended" value={data?.clinics.suspended ?? 0} icon="ban-outline" color={T.danger} onPress={() => router.push("/(admin)/clinics")} />
            </View>

            <SectionHeader label="Invoices" style={styles.sectionGap} />
            <View style={styles.kpiGrid}>
              <KpiCard label="Pending" value={data?.invoices.pending ?? 0} icon="time-outline" color={T.warning} onPress={() => router.push("/(admin)/invoices")} />
              <KpiCard label="Unpaid" value={data?.invoices.unpaid ?? 0} icon="alert-circle-outline" color={T.danger} onPress={() => router.push("/(admin)/invoices")} />
              <KpiCard label="Paid" value={data?.invoices.paid ?? 0} icon="checkmark-done-outline" color={T.success} onPress={() => router.push("/(admin)/invoices")} />
            </View>

            <SectionHeader label="Quick Actions" style={styles.sectionGap} />
            <Card noPad>
              <NavRow icon="add-circle-outline" label="Create Clinic" sub="Add a new clinic to the platform" onPress={() => router.push("/(admin)/clinics/create")} />
              <Divider inset={64} />
              <NavRow icon="business-outline" label="Manage Clinics" sub="Edit, suspend, and view all clinics" onPress={() => router.push("/(admin)/clinics")} />
              <Divider inset={64} />
              <NavRow icon="people-outline" label="Manage Users" sub="Managers, admins and accounts" onPress={() => router.push("/(admin)/users")} />
              <Divider inset={64} />
              <NavRow icon="document-text-outline" label="View Invoices" sub="Billing history and overdue invoices" onPress={() => router.push("/(admin)/invoices")} />
            </Card>

            {(data?.recentInvoices?.length ?? 0) > 0 && (
              <>
                <SectionHeader label="Recent Invoices" style={styles.sectionGap} />
                <Card noPad>
                  {data!.recentInvoices.map((inv, i) => (
                    <React.Fragment key={inv.id}>
                      {i > 0 && <Divider />}
                      <Pressable
                        style={({ pressed }) => [styles.invRow, { opacity: pressed ? 0.7 : 1 }]}
                        onPress={() => router.push({ pathname: "/(admin)/invoices/[id]", params: { id: inv.id } })}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.invClinic} numberOfLines={1}>{inv.clinic?.name ?? "—"}</Text>
                          <Text style={styles.invMeta}>{inv.period} · {inv.currency} {inv.total.toFixed(2)}</Text>
                        </View>
                        <StatusPill status={inv.status} small />
                        <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                      </Pressable>
                    </React.Fragment>
                  ))}
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function KpiCard({ label, value, icon, color, onPress }: {
  label: string; value: number; icon: keyof typeof Ionicons.glyphMap;
  color: string; onPress?: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.kpiCard, cardShadow, { opacity: pressed ? 0.85 : 1 }]} onPress={onPress}>
      <View style={[styles.kpiIconWrap, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </Pressable>
  );
}

function NavRow({ icon, label, sub, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub: string; onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.7 : 1 }]} onPress={onPress}>
      <View style={[styles.navIcon, { backgroundColor: T.primary + "12" }]}>
        <Ionicons name={icon} size={18} color={T.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  sectionGap: { marginTop: 20 },
  kpiGrid: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    alignItems: "flex-start",
    gap: 6,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  kpiValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    lineHeight: 30,
  },
  kpiLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textSec,
  },
  navRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  navIcon: { width: 38, height: 38, borderRadius: T.r10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  navLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  navSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 1 },
  invRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  invClinic: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
  invMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec },
});
