import React from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { T, softShadow } from "@/constants/adminTheme";
import { useAuth } from "@/context/AuthContext";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, Divider } from "@/components/ui";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { BannerCarousel } from "@/components/dashboard/BannerCarousel";
import { KpiGrid } from "@/components/dashboard/KpiGrid";
import { RecentInvoicesList } from "@/components/dashboard/RecentInvoicesList";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

function NavRow({
  icon,
  label,
  sub,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.navIcon, { backgroundColor: (color ?? T.primary) + "12" }]}>
        <Ionicons name={icon} size={18} color={color ?? T.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
    </Pressable>
  );
}

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="warning-outline" size={18} color={T.danger} />
      <Text style={styles.errorText}>Failed to load dashboard data</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, isError, refetch, isRefetching } = useAdminDashboard();

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
        <BannerCarousel data={data} isLoading={isLoading} />

        <View style={styles.body}>
          {isError && !isLoading && <ErrorBanner onRetry={refetch} />}

          {/* ── Overview KPIs ─────────────────────────────────── */}
          <Text style={styles.sectionLabel}>OVERVIEW</Text>
          <KpiGrid data={data} isLoading={isLoading} />

          {/* ── Quick Actions ─────────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>QUICK ACTIONS</Text>
          <Card noPad style={softShadow}>
            <NavRow
              icon="add-circle-outline"
              label="Create Clinic"
              sub="Add a new clinic to the platform"
              onPress={() => router.push("/(admin)/clinics/create")}
            />
            <Divider inset={64} />
            <NavRow
              icon="business-outline"
              label="All Clinics"
              sub="Edit, suspend, and view all clinics"
              onPress={() => router.push("/(admin)/clinics")}
            />
            <Divider inset={64} />
            <NavRow
              icon="document-text-outline"
              label="All Invoices"
              sub="Billing history across all clinics"
              onPress={() => router.push("/(admin)/invoices")}
            />
            <Divider inset={64} />
            <NavRow
              icon="people-outline"
              label="Manage Users"
              sub="Managers, admins and accounts"
              onPress={() => router.push("/(admin)/users")}
            />
          </Card>

          {/* ── Recent Invoices ────────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>RECENT INVOICES</Text>
          <RecentInvoicesList
            invoices={data?.recentInvoices}
            isLoading={isLoading}
          />

          {/* ── Activity Feed ─────────────────────────────────── */}
          <Text style={[styles.sectionLabel, styles.sectionGap]}>RECENT ACTIVITY</Text>
          <ActivityFeed activity={data?.activity} isLoading={isLoading} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },

  body: { paddingHorizontal: 16, paddingTop: 4 },

  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionGap: { marginTop: 24 },

  navRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  navIcon: {
    width: 38,
    height: 38,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  navLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  navSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 1,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.dangerBg,
    borderWidth: 1,
    borderColor: T.dangerBorder,
    borderRadius: T.r10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.dangerText,
  },
  retryBtn: {
    backgroundColor: T.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r8,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
});
