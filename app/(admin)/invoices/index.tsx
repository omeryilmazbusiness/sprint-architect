import React, { useState, useMemo, useEffect } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusPill, EmptyState, LoadingState, ErrorState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listAdminInvoices, InvoiceListResponse } from "@/lib/api/adminInvoices";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";
import { FilterButton } from "@/components/filters/FilterButton";
import { FilterPickerModal, PickerOption } from "@/components/filters/FilterPickerModal";
import { ActiveFilterChips, ActiveChip } from "@/components/filters/ActiveFilterChips";
import { normalizeInvoiceFilters } from "@/utils/navigationFilters";
import { useT } from "@/hooks/useT";

const STATUS_FILTERS = ["ALL", "PENDING", "UNPAID", "PAID"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
const PERIOD_REGEX = /^\d{4}-\d{2}$/;

function statusAccent(status: string): string {
  if (status === "PAID") return T.success;
  if (status === "UNPAID") return T.danger;
  if (status === "PENDING") return T.warning;
  return T.accent;
}

export default function AdminInvoicesScreen() {
  const t = useT();
  const ti = t.adminInvoices;
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const routeParams = useLocalSearchParams<{ status?: string; clinicId?: string; period?: string }>();
  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [clinicFilter, setClinicFilter] = useState("");
  const [pickerOpen, setPickerOpen] = useState<"clinic" | "status" | null>(null);

  useEffect(() => {
    const filters = normalizeInvoiceFilters(routeParams as Record<string, string | undefined>);
    setStatusFilter(filters.status ?? "ALL");
    setClinicFilter(filters.clinicId ?? "");
    setPeriod(filters.period ?? "");
  }, [routeParams.status, routeParams.clinicId, routeParams.period]);

  const validPeriod = period.length === 7 && PERIOD_REGEX.test(period) ? period : undefined;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<InvoiceListResponse>({
    queryKey: ["/v1/admin/invoices", validPeriod, statusFilter, clinicFilter],
    queryFn: () => listAdminInvoices({
      period: validPeriod,
      status: statusFilter !== "ALL" ? statusFilter : undefined,
      clinicId: clinicFilter || undefined,
    }),
  });

  const { data: clinicsData } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", "all"],
    queryFn: () => listClinics({ pageSize: 200 }),
  });

  async function handleLogout() { await logout(); router.replace("/(auth)/login"); }

  const clinics = clinicsData?.rows ?? [];
  const clinicOptions: PickerOption[] = useMemo(
    () => clinics.map((c) => ({ value: c.id, label: c.name })),
    [clinics]
  );
  const statusOptions: PickerOption[] = [
    { value: "PENDING", label: "Pending" },
    { value: "UNPAID", label: "Unpaid" },
    { value: "PAID", label: "Paid" },
  ];

  const selectedClinicName = clinics.find((c) => c.id === clinicFilter)?.name;
  const hasFilters = !!clinicFilter || statusFilter !== "ALL" || !!validPeriod;

  const activeChips: ActiveChip[] = [];
  if (validPeriod) activeChips.push({ key: "period", label: `Period: ${validPeriod}`, onRemove: () => setPeriod("") });
  if (clinicFilter && selectedClinicName) activeChips.push({ key: "clinic", label: selectedClinicName, onRemove: () => setClinicFilter("") });
  if (statusFilter !== "ALL") activeChips.push({ key: "status", label: statusFilter, onRemove: () => setStatusFilter("ALL") });

  function clearAllFilters() {
    setPeriod("");
    setClinicFilter("");
    setStatusFilter("ALL");
  }

  return (
    <View style={styles.root}>
      <AdminHeader
        title={ti.pageTitle}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <View style={styles.filterArea}>
        <View style={styles.periodRow}>
          <Ionicons name="calendar-outline" size={16} color={T.textMuted} />
          <TextInput
            style={[styles.periodInput, period && !validPeriod ? { color: T.danger } : null]}
            placeholder={ti.periodPlaceholder}
            placeholderTextColor={T.textMuted}
            value={period}
            onChangeText={setPeriod}
            maxLength={7}
            autoCapitalize="none"
            returnKeyType="done"
          />
          {period.length > 0 && (
            <Pressable onPress={() => setPeriod("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>
        {period.length > 0 && !validPeriod && (
          <Text style={styles.periodHint}>{ti.periodHint}</Text>
        )}

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <FilterButton
              icon="business-outline"
              label={ti.filterClinic}
              value={selectedClinicName}
              onPress={() => setPickerOpen("clinic")}
            />
            <FilterButton
              icon="checkmark-circle-outline"
              label={ti.filterStatus}
              value={statusFilter !== "ALL" ? statusFilter : undefined}
              onPress={() => setPickerOpen("status")}
            />
            {hasFilters && (
              <Pressable style={styles.clearBtn} onPress={clearAllFilters}>
                <Ionicons name="refresh-outline" size={13} color={T.textSec} />
                <Text style={styles.clearBtnText}>{t.adminClinics.filterStatus}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />
      </View>

      {isLoading ? (
        <LoadingState message={ti.loadingInvoices} />
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
            <Text style={styles.countLabel}>
              {data.total === 1 ? ti.countOne : ti.countMany.replace("{n}", String(data.total))}
            </Text>
          ) : null}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title={ti.emptyTitle}
              subtitle={hasFilters ? ti.emptySubFilter : ti.emptySubAuto}
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
                    <Text style={styles.clinicName} numberOfLines={1}>{item.clinic?.name ?? ti.unknownClinic}</Text>
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

      <FilterPickerModal
        visible={pickerOpen === "clinic"}
        title={ti.filterByClinic}
        options={clinicOptions}
        selected={clinicFilter}
        onSelect={setClinicFilter}
        onClose={() => setPickerOpen(null)}
        searchable={clinicOptions.length > 6}
        allLabel={ti.allClinics}
      />
      <FilterPickerModal
        visible={pickerOpen === "status"}
        title={ti.filterByStatus}
        options={statusOptions}
        selected={statusFilter !== "ALL" ? statusFilter : ""}
        onSelect={(v) => setStatusFilter((v || "ALL") as StatusFilter)}
        onClose={() => setPickerOpen(null)}
        allLabel={ti.allStatuses}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  filterArea: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  periodRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  periodInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  periodHint: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.danger, paddingHorizontal: 16, marginTop: 2 },
  filterRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  filterScroll: { paddingHorizontal: 14, paddingVertical: 9, gap: 7, flexDirection: "row", alignItems: "center" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface },
  clearBtnText: { fontFamily: "Inter_500Medium", fontSize: 12.5, color: T.textSec },
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
