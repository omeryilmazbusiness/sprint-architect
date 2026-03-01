import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Invoice {
  id: string;
  period: string;
  patientCount: number;
  unitPrice: string;
  currency: string;
  total: string;
  status: "PENDING" | "UNPAID" | "PAID";
  createdAt: string;
}

interface ClinicInfo {
  id: string;
  name: string;
  status: string;
}

const STATUS_OPTIONS = ["ALL", "PENDING", "UNPAID", "PAID"];

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function statusLabel(s: Invoice["status"]) {
  if (s === "PENDING") return "PENDING";
  if (s === "UNPAID") return "OVERDUE";
  return "PAID";
}

function statusColor(s: Invoice["status"]) {
  if (s === "PAID") return { bg: T.successBg, border: T.successBorder, text: T.successText };
  if (s === "UNPAID") return { bg: T.dangerBg, border: T.dangerBorder, text: T.dangerText };
  return { bg: T.warningBg, border: T.warningBorder, text: T.warningText };
}

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const [expanded, setExpanded] = useState(false);
  const sc = statusColor(invoice.status);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.85 : 1 }]}
      onPress={() => setExpanded((v) => !v)}
    >
      <View style={styles.cardTop}>
        <View style={[styles.periodBadge, { backgroundColor: T.primary + "12" }]}>
          <Ionicons name="calendar-outline" size={14} color={T.primary} />
          <Text style={styles.period}>{formatPeriod(invoice.period)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: sc.bg, borderColor: sc.border }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{statusLabel(invoice.status)}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <Text style={styles.totalAmount}>
          {invoice.currency} {parseFloat(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <Text style={styles.patientCount}>{invoice.patientCount} guests</Text>
      </View>

      {expanded && (
        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Unit price</Text>
            <Text style={styles.breakdownValue}>{invoice.currency} {parseFloat(invoice.unitPrice).toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Guests</Text>
            <Text style={styles.breakdownValue}>× {invoice.patientCount}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={styles.breakdownLabel}>Total</Text>
            <Text style={[styles.breakdownValue, styles.breakdownTotalValue]}>
              {invoice.currency} {parseFloat(invoice.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
          <Text style={styles.issuedAt}>
            Created {new Date(invoice.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={T.textMuted}
        />
      </View>
    </Pressable>
  );
}

export default function InvoicesScreen() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: clinic } = useQuery<ClinicInfo>({
    queryKey: ["/v1/manager/clinic-info"],
  });

  const suspended = clinic?.status === "SUSPENDED";

  const {
    data: invoices,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Invoice[]>({
    queryKey: ["/v1/manager/invoices", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await apiRequest("GET", `/v1/manager/invoices?${params.toString()}`);
      const data = await res.json();
      return Array.isArray(data) ? data : (data.rows ?? []);
    },
  });

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.root}>
      <ManagerHeader title="Invoices" subtitle={clinic?.name} onLogout={handleLogout} />

      {suspended && (
        <View style={styles.suspendedBanner}>
          <Ionicons name="warning-outline" size={18} color={T.dangerText} />
          <Text style={styles.suspendedText}>
            Clinic suspended due to unpaid invoice. Contact support to resolve.
          </Text>
        </View>
      )}

      <View style={styles.filters}>
        {STATUS_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            style={({ pressed }) => [
              styles.filterChip,
              statusFilter === opt && styles.filterChipActive,
              { opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => setStatusFilter(opt)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === opt && styles.filterChipTextActive,
              ]}
            >
              {opt === "ALL" ? "All" : statusLabel(opt as Invoice["status"])}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={invoices ?? []}
          keyExtractor={(inv) => inv.id}
          contentContainerStyle={{ 
            padding: T.sp16, 
            gap: T.sp12 as number, 
            paddingBottom: bottomPad + 80 
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>No invoices found.</Text>
            </View>
          }
          renderItem={({ item }) => <InvoiceCard invoice={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  suspendedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp8,
    backgroundColor: T.dangerBg,
    borderBottomWidth: 1,
    borderBottomColor: T.dangerBorder,
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
  },
  suspendedText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.dangerText,
    lineHeight: 18,
  },
  filters: {
    flexDirection: "row",
    gap: T.sp8,
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  filterChip: {
    paddingHorizontal: T.sp12,
    paddingVertical: 6,
    borderRadius: T.r20,
    backgroundColor: T.inactiveBg,
    borderWidth: 1,
    borderColor: T.inactiveBorder,
  },
  filterChipActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textMuted,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    borderWidth: 1,
    borderColor: T.border,
    gap: T.sp12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  periodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.r8,
  },
  period: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 13,
    color: T.primary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: T.r20,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 11,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  totalAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: T.text,
    letterSpacing: -0.5,
  },
  patientCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  breakdown: {
    gap: T.sp8,
    paddingTop: T.sp12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
  },
  breakdownValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.text,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: T.sp8,
    marginTop: T.sp4,
  },
  breakdownTotalValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: T.primary,
  },
  issuedAt: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.textMuted,
  },
  cardFooter: {
    alignItems: "center",
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
    gap: T.sp12,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
});
