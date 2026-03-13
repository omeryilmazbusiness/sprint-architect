import React, { useState, useEffect } from "react";
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
  Linking,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusPill, EmptyState, LoadingState, ErrorState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listClinics, ClinicListResponse, Clinic } from "@/lib/api/adminClinics";
import { FilterButton } from "@/components/filters/FilterButton";
import { FilterPickerModal, PickerOption } from "@/components/filters/FilterPickerModal";
import { ActiveFilterChips, ActiveChip } from "@/components/filters/ActiveFilterChips";
import { normalizeClinicFilters, ClinicStatus } from "@/utils/navigationFilters";
import { serviceLabel } from "@/constants/services";

const STATUS_OPTIONS: PickerOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

// ─── Module-level card sub-components ─────────────────────────────────────────

function ClinicAvatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{name.slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

function ServiceChips({ services }: { services: string[] }) {
  if (!services || services.length === 0) return null;
  const visible = services.slice(0, 2);
  const extra = services.length - 2;
  return (
    <Text style={styles.serviceText} numberOfLines={1}>
      {visible.map(serviceLabel).join(" · ")}{extra > 0 ? ` +${extra}` : ""}
    </Text>
  );
}

function ManagerRow({ clinic }: { clinic: Clinic }) {
  const mgr = clinic.primaryManager;
  const phone = clinic.contactPhone;

  if (!mgr && !phone) return null;

  return (
    <View style={styles.managerRow}>
      <Ionicons name="person-outline" size={11} color={T.textMuted} />
      <Text style={styles.managerText} numberOfLines={1}>
        {mgr ? mgr.email : "No manager"}
      </Text>
      {phone && (
        <Pressable
          style={styles.phonePill}
          onPress={(e) => {
            e.stopPropagation?.();
            Linking.openURL(`tel:${phone}`);
          }}
          hitSlop={8}
        >
          <Ionicons name="call-outline" size={10} color={T.accent} />
          <Text style={styles.phoneText}>{phone}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ClinicCard({ item, onPress }: { item: Clinic; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <ClinicAvatar name={item.name} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.clinicName} numberOfLines={1}>{item.name}</Text>
          <StatusPill status={item.status} small />
        </View>
        <ServiceChips services={item.services} />
        <ManagerRow clinic={item} />
      </View>
      <Ionicons name="chevron-forward" size={14} color={T.textMuted} style={styles.chevron} />
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

function NewBtn() {
  return (
    <Pressable
      testID="create-clinic-btn"
      style={styles.newBtn}
      onPress={() => router.push("/(admin)/clinics/create")}
    >
      <Ionicons name="add" size={16} color="#fff" />
      <Text style={styles.newBtnText}>New</Text>
    </Pressable>
  );
}

export default function ClinicsScreen() {
  const { user, logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const routeParams = useLocalSearchParams<{ status?: string }>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [statusFilter, setStatusFilter] = useState<ClinicStatus | "">("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const filters = normalizeClinicFilters(routeParams as Record<string, string | undefined>);
    setStatusFilter(filters.status ?? "");
  }, [routeParams.status]);

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => setDebouncedSearch(text), 300);
    setDebounceTimer(t);
  }

  const hasFilters = !!statusFilter || !!debouncedSearch;

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", debouncedSearch, statusFilter],
    queryFn: () => listClinics({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    }),
  });

  async function handleLogout() { await logout(); router.replace("/(auth)/login"); }

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("");
  }

  const activeChips: ActiveChip[] = [];
  if (statusFilter) activeChips.push({ key: "status", label: statusFilter, onRemove: () => setStatusFilter("") });
  if (debouncedSearch) activeChips.push({
    key: "search",
    label: `"${debouncedSearch}"`,
    onRemove: () => { setSearch(""); setDebouncedSearch(""); },
  });

  return (
    <View style={styles.root}>
      <AdminHeader title="Clinics" userEmail={user?.email} onLogout={handleLogout} right={<NewBtn />} />

      <View style={styles.filterArea}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={T.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clinics…"
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <FilterButton
              icon="shield-outline"
              label="Status"
              value={statusFilter || undefined}
              onPress={() => setPickerOpen(true)}
            />
            {hasFilters && (
              <Pressable style={styles.clearBtn} onPress={clearFilters}>
                <Ionicons name="refresh-outline" size={13} color={T.textSec} />
                <Text style={styles.clearBtnText}>Reset</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        <ActiveFilterChips chips={activeChips} onClearAll={clearFilters} />
      </View>

      {isLoading ? (
        <LoadingState message="Loading clinics…" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          {data && (
            <Text style={styles.countLabel}>
              {data.total} clinic{data.total !== 1 ? "s" : ""}
            </Text>
          )}
          <FlatList
            data={data?.rows ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
            scrollEnabled={!!(data?.rows?.length)}
            ListEmptyComponent={
              <EmptyState
                icon="business-outline"
                title="No clinics found"
                subtitle={hasFilters ? "Try clearing your filters" : "Create your first clinic"}
              />
            }
            renderItem={({ item }) => (
              <ClinicCard
                item={item}
                onPress={() => router.push({ pathname: "/(admin)/clinics/[id]", params: { id: item.id } })}
              />
            )}
          />
        </>
      )}

      <FilterPickerModal
        visible={pickerOpen}
        title="Filter by Status"
        options={STATUS_OPTIONS}
        selected={statusFilter}
        onSelect={(v) => setStatusFilter((v || "") as ClinicStatus | "")}
        onClose={() => setPickerOpen(false)}
        allLabel="All Statuses"
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: T.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.r8,
  },
  newBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },

  filterArea: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  filterRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  filterScroll: { paddingHorizontal: 14, paddingVertical: 9, gap: 7, flexDirection: "row", alignItems: "center" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  clearBtnText: { fontFamily: "Inter_500Medium", fontSize: 12.5, color: T.textSec },

  countLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: T.bg,
  },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: T.r12,
    backgroundColor: T.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: T.primary },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  clinicName: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: T.text },
  chevron: { flexShrink: 0 },

  serviceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textSec,
  },

  managerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  managerText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    color: T.textMuted,
  },
  phonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: T.accent + "12",
    flexShrink: 0,
  },
  phoneText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.accent,
  },
});
