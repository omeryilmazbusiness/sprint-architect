import React, { useState, useMemo } from "react";
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
import { listUnifiedEntities, UnifiedEntity, UnifiedListResponse } from "@/lib/api/adminUsers";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { FilterButton } from "@/components/filters/FilterButton";
import { FilterPickerModal, PickerOption } from "@/components/filters/FilterPickerModal";
import { ActiveFilterChips, ActiveChip } from "@/components/filters/ActiveFilterChips";
import CreateUserSheet from "@/components/admin/CreateUserSheet";

type EntityType = "ALL" | "MANAGER" | "PATIENT" | "ADMIN";
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function entityAccent(type: string): string {
  if (type === "PATIENT") return T.accent;
  if (type === "ADMIN") return "#7C3AED";
  return T.primary;
}

function entityIcon(type: string): string {
  if (type === "PATIENT") return "person-outline";
  if (type === "ADMIN") return "shield-outline";
  return "briefcase-outline";
}

export default function UsersScreen() {
  const { user, logout } = useAuth();
  const params = useLocalSearchParams<{ preselectedClinicId?: string }>();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [clinicFilter, setClinicFilter] = useState<string>(params.preselectedClinicId ?? "");

  const [pickerOpen, setPickerOpen] = useState<"clinic" | "type" | "status" | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<UnifiedListResponse>({
    queryKey: ["/v1/admin/users", debouncedSearch, entityTypeFilter, statusFilter, clinicFilter],
    queryFn: () =>
      listUnifiedEntities({
        search: debouncedSearch || undefined,
        entityType: entityTypeFilter !== "ALL" ? entityTypeFilter as "ADMIN" | "MANAGER" | "PATIENT" : undefined,
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

  const typeOptions: PickerOption[] = [
    { value: "MANAGER", label: "Manager" },
    { value: "PATIENT", label: "Patient" },
    { value: "ADMIN", label: "Admin" },
  ];

  const statusOptions: PickerOption[] = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "SUSPENDED", label: "Suspended" },
  ];

  const selectedClinicName = clinics.find((c) => c.id === clinicFilter)?.name;
  const hasFilters = !!clinicFilter || entityTypeFilter !== "ALL" || statusFilter !== "ALL" || !!search;

  const activeChips: ActiveChip[] = [];
  if (search) activeChips.push({ key: "search", label: `"${search}"`, onRemove: () => setSearch("") });
  if (clinicFilter && selectedClinicName) activeChips.push({ key: "clinic", label: selectedClinicName, onRemove: () => setClinicFilter("") });
  if (entityTypeFilter !== "ALL") activeChips.push({ key: "type", label: entityTypeFilter, onRemove: () => setEntityTypeFilter("ALL") });
  if (statusFilter !== "ALL") activeChips.push({ key: "status", label: statusFilter, onRemove: () => setStatusFilter("ALL") });

  function clearAllFilters() {
    setSearch("");
    setClinicFilter("");
    setEntityTypeFilter("ALL");
    setStatusFilter("ALL");
  }

  return (
    <View style={styles.root}>
      <AdminHeader
        title="Users & Patients"
        userEmail={user?.email}
        onLogout={handleLogout}
        right={
          <Pressable style={styles.newBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.newBtnText}>New User</Text>
          </Pressable>
        }
      />

      <View style={styles.filterArea}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={T.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email…"
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <FilterButton
              icon="business-outline"
              label="Clinic"
              value={selectedClinicName}
              onPress={() => setPickerOpen("clinic")}
            />
            <FilterButton
              icon="person-outline"
              label="Type"
              value={entityTypeFilter !== "ALL" ? entityTypeFilter : undefined}
              onPress={() => setPickerOpen("type")}
            />
            <FilterButton
              icon="checkmark-circle-outline"
              label="Status"
              value={statusFilter !== "ALL" ? statusFilter : undefined}
              onPress={() => setPickerOpen("status")}
            />
            {hasFilters && (
              <Pressable style={styles.clearBtn} onPress={clearAllFilters}>
                <Ionicons name="refresh-outline" size={13} color={T.textSec} />
                <Text style={styles.clearBtnText}>Reset</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>

        <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />
      </View>

      {isLoading ? (
        <LoadingState message="Loading users & patients…" />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.rows ?? []}
          keyExtractor={(item) => `${item.entityType}-${item.id}`}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          scrollEnabled={!!(data?.rows?.length)}
          ListHeaderComponent={data ? (
            <Text style={styles.countLabel}>{data.total} record{data.total !== 1 ? "s" : ""}</Text>
          ) : null}
          ListEmptyComponent={
            <EmptyState icon="people-outline" title="No records found" subtitle="Adjust filters or create a new user" />
          }
          renderItem={({ item }) => <EntityCard item={item} />}
        />
      )}

      <FilterPickerModal
        visible={pickerOpen === "clinic"}
        title="Filter by Clinic"
        options={clinicOptions}
        selected={clinicFilter}
        onSelect={setClinicFilter}
        onClose={() => setPickerOpen(null)}
        searchable={clinicOptions.length > 6}
        allLabel="All Clinics"
      />
      <FilterPickerModal
        visible={pickerOpen === "type"}
        title="Filter by Type"
        options={typeOptions}
        selected={entityTypeFilter !== "ALL" ? entityTypeFilter : ""}
        onSelect={(v) => setEntityTypeFilter((v || "ALL") as EntityType)}
        onClose={() => setPickerOpen(null)}
        allLabel="All Types"
      />
      <FilterPickerModal
        visible={pickerOpen === "status"}
        title="Filter by Status"
        options={statusOptions}
        selected={statusFilter !== "ALL" ? statusFilter : ""}
        onSelect={(v) => setStatusFilter((v || "ALL") as StatusFilter)}
        onClose={() => setPickerOpen(null)}
        allLabel="All Statuses"
      />

      <CreateUserSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        defaultRole="MANAGER"
      />

    </View>
  );
}

function EntityCard({ item }: { item: UnifiedEntity }) {
  const color = entityAccent(item.entityType);
  const icon = entityIcon(item.entityType);
  const subtitle = item.entityType === "PATIENT"
    ? item.patientKey ? `Key: ${item.patientKey}` : item.email ?? ""
    : item.email ?? "";

  function handlePress() {
    if (item.entityType !== "PATIENT") {
      router.push({ pathname: "/(admin)/users/[id]", params: { id: item.id } });
    }
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed && item.entityType !== "PATIENT" ? 0.85 : 1 }]}
      onPress={handlePress}
    >
      <View style={[styles.avatarWrap, { backgroundColor: color + "12" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{item.displayName}</Text>
        <View style={styles.cardMeta}>
          <View style={[styles.typeBadge, { backgroundColor: color + "12" }]}>
            <Text style={[styles.typeText, { color }]}>{item.entityType}</Text>
          </View>
          {item.clinicName && (
            <Text style={styles.clinicLabel} numberOfLines={1}>{item.clinicName}</Text>
          )}
        </View>
        {subtitle ? <Text style={styles.cardSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.cardRight}>
        <StatusPill status={item.status} small />
        {item.entityType !== "PATIENT" && <Ionicons name="chevron-forward" size={13} color={T.textMuted} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: T.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.r8 },
  newBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  filterArea: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  filterRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  filterScroll: { paddingHorizontal: 14, paddingVertical: 9, gap: 7, flexDirection: "row", alignItems: "center" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, backgroundColor: T.surface },
  clearBtnText: { fontFamily: "Inter_500Medium", fontSize: 12.5, color: T.textSec },
  countLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, paddingHorizontal: 16, paddingVertical: 8 },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: T.surface, borderRadius: T.r14, borderWidth: 1, borderColor: T.border, padding: 14, gap: 12 },
  avatarWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.3 },
  clinicLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textSec, flex: 1 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted },
  cardRight: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginTop: 10 },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: T.text },
  sheetBody: { padding: 20, gap: 14, paddingBottom: 40 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 0.5, color: T.textSec },
  infoBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: T.accent + "10", borderWidth: 1, borderColor: T.accent + "30", borderRadius: T.r10, padding: 12 },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: T.accent },
  roleRow: { flexDirection: "row", gap: 8 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: T.r10, borderWidth: 1.5, alignItems: "center" },
  roleOptionActive: { borderColor: T.primary, backgroundColor: T.primary + "10" },
  roleOptionInactive: { borderColor: T.border, backgroundColor: "transparent" },
  roleOptionText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  clinicPicker: { maxHeight: 140, borderWidth: 1, borderColor: T.border, borderRadius: T.r10 },
  clinicOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, borderRadius: T.r8, marginHorizontal: 4, marginVertical: 2 },
  clinicOptionActive: { backgroundColor: T.primary + "10" },
  clinicOptionInactive: { backgroundColor: "transparent" },
  clinicOptionText: { fontFamily: "Inter_400Regular", fontSize: 14, flex: 1 },
  sheetBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", borderWidth: 1.5, borderColor: T.border },
  cancelBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.textSec },
  createBtn: { flex: 1, borderRadius: T.r10, paddingVertical: 13, alignItems: "center", backgroundColor: T.primary },
  createBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  pwModal: { backgroundColor: T.surface, borderRadius: T.r20, padding: 24, marginHorizontal: 24, alignItems: "center", gap: 14 },
  pwIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: T.successBg, alignItems: "center", justifyContent: "center" },
  pwTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: T.text },
  pwSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec, textAlign: "center", lineHeight: 20 },
  pwBox: { flexDirection: "row", alignItems: "center", backgroundColor: T.surfaceSubtle, borderWidth: 1, borderColor: T.border, borderRadius: T.r12, paddingHorizontal: 16, paddingVertical: 12, width: "100%", gap: 12 },
  pwValue: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 16, letterSpacing: 1, color: T.text },
  copyBtn: { padding: 4 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%", borderWidth: 1, borderColor: T.border, borderRadius: T.r12, padding: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  confirmText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: T.textSec },
  doneBtn: { borderRadius: T.r12, paddingVertical: 14, alignItems: "center", width: "100%" },
  doneBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});
