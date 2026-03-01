import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusPill, EmptyState, LoadingState, ErrorState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listAdminInvoices, InvoiceListResponse } from "@/lib/api/adminInvoices";

const STATUS_FILTERS = ["ALL", "PENDING", "UNPAID", "PAID"] as const;
const PERIOD_REGEX = /^\d{4}-\d{2}$/;

function statusAccent(status: string): string {
  if (status === "PAID") return T.success;
  if (status === "UNPAID") return T.danger;
  if (status === "PENDING") return T.warning;
  return T.accent;
}

export default function AdminInvoicesScreen() {
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");

  const validPeriod = period.length === 7 && PERIOD_REGEX.test(period) ? period : undefined;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<InvoiceListResponse>({
    queryKey: ["/v1/admin/invoices", validPeriod, statusFilter],
    queryFn: () => listAdminInvoices({ period: validPeriod, status: statusFilter !== "ALL" ? statusFilter : undefined }),
  });

  async function handleLogout() { await logout(); router.replace("/(auth)/login"); }

  return (
    <View style={styles.root}>
      <AdminHeader
        title="Invoices"
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <View style={styles.filterArea}>
        <View style={styles.periodRow}>
          <Ionicons name="calendar-outline" size={16} color={T.textMuted} />
          <TextInput
            style={[styles.periodInput, period && !validPeriod ? { color: T.danger } : null]}
            placeholder="Filter by period (YYYY-MM)"
            placeholderTextColor={T.textMuted}
            value={period}
            onChangeText={setPeriod}
            maxLength={7}
            autoCapitalize="none"
          />
          {period.length > 0 && (
            <Pressable onPress={() => setPeriod("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>
        {period.length > 0 && !validPeriod && (
          <Text style={styles.periodHint}>Enter a complete period, e.g. 2026-02</Text>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {STATUS_FILTERS.map((s) => {
            const c = s === "ALL" ? T.primary : statusAccent(s);
            const active = statusFilter === s;
            return (
              <Pressable
                key={s}
                style={[styles.chip, active ? { backgroundColor: c + "15", borderColor: c } : styles.chipInactive]}
                onPress={() => setStatusFilter(s)}
              >
                {s !== "ALL" && (
                  <View style={[styles.dot, { backgroundColor: c }]} />
                )}
                <Text style={[styles.chipText, { color: active ? c : T.textSec }]}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingState message="Loading invoices…" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.rows ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          scrollEnabled={!!(data?.rows?.length)}
          ListHeaderComponent={data ? (
            <Text style={styles.countLabel}>{data.total} invoice{data.total !== 1 ? "s" : ""}</Text>
          ) : null}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No invoices found"
              subtitle={validPeriod || statusFilter !== "ALL" ? "Try clearing your filters" : "Generate invoices for a billing period"}
            />
          }
          renderItem={({ item }) => {
            const sc = statusAccent(item.status);
            return (
              <Pressable
                style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.85 : 1 }]}
                onPress={() => router.push({ pathname: "/(admin)/invoices/[id]", params: { id: item.id } })}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.invIcon, { backgroundColor: sc + "15" }]}>
                    <Ionicons name="document-text-outline" size={18} color={sc} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.clinicName} numberOfLines={1}>{item.clinic?.name ?? "Unknown Clinic"}</Text>
                    <View style={styles.cardMeta}>
                      <Text style={styles.period}>{item.period}</Text>
                      <Text style={styles.metaDot}>·</Text>
                      <Ionicons name="people-outline" size={12} color={T.textMuted} />
                      <Text style={styles.patCount}>{item.patientCount}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.total, { color: T.text }]}>{item.currency} {item.total.toFixed(2)}</Text>
                  <StatusPill status={item.status} small />
                  <Ionicons name="chevron-forward" size={13} color={T.textMuted} />
                </View>
              </Pressable>
            );
          }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  filterArea: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, paddingBottom: 8 },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  periodInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  periodHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.danger, paddingHorizontal: 16, marginTop: 2 },
  chipsScroll: { paddingHorizontal: 16, paddingVertical: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipInactive: { backgroundColor: "transparent", borderColor: T.border },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  countLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, paddingHorizontal: 16, paddingVertical: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: T.surface, borderRadius: T.r14, borderWidth: 1, borderColor: T.border, padding: 14, gap: 12 },
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  invIcon: { width: 40, height: 40, borderRadius: T.r10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  clinicName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  period: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec },
  metaDot: { color: T.textMuted, fontSize: 12 },
  patCount: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textSec },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  total: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
