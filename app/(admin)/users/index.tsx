import React, { useState, useMemo, useCallback } from "react";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState, ErrorState } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";
import {
  bulkDeactivate,
  bulkPurge,
  type BulkDeactivateTarget,
  type BulkPurgeTarget,
} from "@/lib/api/adminUsers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminUsersQuery, useInvalidateAdminUsers } from "@/hooks/useAdminUsersQuery";
import { useSelection } from "@/hooks/useSelection";
import { UserListRowCard } from "@/components/users/UserListRowCard";
import { BulkDeleteModal } from "@/components/users/BulkDeleteModal";
import { DangerPurgeModal } from "@/components/users/DangerPurgeModal";
import { FilterButton } from "@/components/filters/FilterButton";
import { FilterPickerModal, PickerOption } from "@/components/filters/FilterPickerModal";
import { ActiveFilterChips, ActiveChip } from "@/components/filters/ActiveFilterChips";
import CreateUserSheet from "@/components/admin/CreateUserSheet";
import { PatientSummarySheet } from "@/components/patients/PatientSummarySheet";
import { useQuery } from "@tanstack/react-query";
import type { UnifiedEntity } from "@/lib/api/adminUsers";
import { useT } from "@/hooks/useT";

type EntityType = "ALL" | "MANAGER" | "PATIENT" | "ADMIN";
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function SkeletonRow() {
  return (
    <View style={[styles.skeletonCard, cardShadow]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonInfo}>
        <View style={[styles.skeletonLine, { width: "60%", height: 14 }]} />
        <View style={[styles.skeletonLine, { width: "40%", height: 10, marginTop: 4 }]} />
        <View style={styles.skeletonChips}>
          <View style={[styles.skeletonChip, { width: 60 }]} />
          <View style={[styles.skeletonChip, { width: 50 }]} />
          <View style={[styles.skeletonChip, { width: 45 }]} />
        </View>
      </View>
    </View>
  );
}

function SkeletonList() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}

export default function UsersScreen() {
  const t = useT();
  const tu = t.adminUsers;
  const { user, logout } = useAuth();
  const params = useLocalSearchParams<{ preselectedClinicId?: string }>();
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const invalidateUsers = useInvalidateAdminUsers();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [clinicFilter, setClinicFilter] = useState<string>(params.preselectedClinicId ?? "");
  const [pickerOpen, setPickerOpen] = useState<"clinic" | "type" | "status" | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [patientSheetId, setPatientSheetId] = useState<string | null>(null);

  const selection = useSelection();

  const { data, isLoading, isError, refetch, isRefetching } = useAdminUsersQuery({
    search: debouncedSearch || undefined,
    entityType: entityTypeFilter !== "ALL" ? entityTypeFilter as "ADMIN" | "MANAGER" | "PATIENT" : undefined,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    clinicId: clinicFilter || undefined,
  });

  const { data: clinicsData } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", "all"],
    queryFn: () => listClinics({ pageSize: 200 }),
  });

  async function handleLogout() { await logout(); router.replace("/(auth)/login"); }

  const clinics = clinicsData?.rows ?? [];
  const rows = data?.rows ?? [];
  const allIds = useMemo(() => rows.map((r) => `${r.entityType}::${r.id}`), [rows]);

  const clinicOptions: PickerOption[] = useMemo(
    () => clinics.map((c) => ({ value: c.id, label: c.name })),
    [clinics],
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
    setSearch(""); setClinicFilter(""); setEntityTypeFilter("ALL"); setStatusFilter("ALL");
  }

  const handleRowPress = useCallback((item: UnifiedEntity, compositeId: string) => {
    if (selection.selectionMode) {
      selection.toggle(compositeId);
    } else if (item.entityType === "PATIENT") {
      setPatientSheetId(item.id);
    } else {
      router.push({ pathname: "/(admin)/users/[id]", params: { id: item.id } });
    }
  }, [selection]);

  const handleLongPress = useCallback((compositeId: string) => {
    if (!selection.selectionMode) {
      selection.enterSelection(compositeId);
    }
  }, [selection]);

  const handleSelectAll = useCallback(() => {
    if (selection.count === rows.length && rows.length > 0) {
      selection.clearAll();
    } else {
      selection.selectAll(allIds);
    }
  }, [selection, rows.length, allIds]);

  async function handleBulkDeactivate() {
    const targets: BulkDeactivateTarget[] = [];
    for (const compositeId of Array.from(selection.selectedIds)) {
      const [entityType, id] = compositeId.split("::");
      targets.push({ id, entityType: entityType as BulkDeactivateTarget["entityType"] });
    }
    setIsBulkDeleting(true);
    try {
      const result = await bulkDeactivate(targets);
      setShowDeleteModal(false);
      selection.exitSelection();
      await invalidateUsers();
      if (result.blocked.length > 0) {
        Alert.alert(
          "Partial Result",
          `Deactivated ${result.deactivated} user${result.deactivated !== 1 ? "s" : ""}. ` +
          `${result.blocked.length} blocked (primary manager or self).`,
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to deactivate users");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  async function handleBulkPurge(confirmText: string) {
    const targets: BulkPurgeTarget[] = [];
    for (const compositeId of Array.from(selection.selectedIds)) {
      const [entityType, id] = compositeId.split("::");
      targets.push({ id, entityType: entityType as BulkPurgeTarget["entityType"] });
    }
    setIsPurging(true);
    try {
      const result = await bulkPurge(targets, confirmText);
      setShowPurgeModal(false);
      selection.exitSelection();
      await invalidateUsers();
      const msg =
        result.blocked.length > 0
          ? `Deleted ${result.purged} user${result.purged !== 1 ? "s" : ""}. ` +
            `${result.blocked.length} blocked: ${result.blocked.map((b) => b.reason).join(", ")}.`
          : `${result.purged} user${result.purged !== 1 ? "s" : ""} permanently deleted.`;
      Alert.alert(result.blocked.length > 0 ? "Partial Result" : "Done", msg);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Purge failed");
    } finally {
      setIsPurging(false);
    }
  }

  const cancelBtn = (
    <Pressable
      style={({ pressed }) => [styles.cancelIconBtn, { opacity: pressed ? 0.65 : 1 }]}
      onPress={selection.exitSelection}
      hitSlop={10}
    >
      <Ionicons name="close" size={18} color={T.primary} />
    </Pressable>
  );

  const selectionActions = (
    <View style={styles.headerSelectionActions}>
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          styles.selectAllBtn,
          { opacity: pressed ? 0.65 : 1 },
        ]}
        onPress={handleSelectAll}
        hitSlop={8}
      >
        <Text style={styles.selectAllText}>
          {selection.count > 0 && selection.count === rows.length ? tu.noneLabel : tu.allLabel}
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.trashBtn,
          selection.count === 0 && styles.actionBtnDisabled,
          { opacity: pressed && selection.count > 0 ? 0.7 : 1 },
        ]}
        onPress={selection.count > 0 ? () => setShowDeleteModal(true) : undefined}
        disabled={selection.count === 0}
        hitSlop={8}
      >
        <Ionicons
          name="trash-outline"
          size={17}
          color={selection.count > 0 ? "#fff" : T.textMuted}
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.purgeBtn,
          selection.count === 0 && styles.actionBtnDisabled,
          { opacity: pressed && selection.count > 0 ? 0.7 : 1 },
        ]}
        onPress={selection.count > 0 ? () => setShowPurgeModal(true) : undefined}
        disabled={selection.count === 0}
        hitSlop={8}
      >
        <Ionicons
          name="close-circle-outline"
          size={17}
          color={selection.count > 0 ? "#fff" : T.textMuted}
        />
      </Pressable>
    </View>
  );

  const addIconBtn = (
    <Pressable
      style={({ pressed }) => [styles.addIconBtn, { opacity: pressed ? 0.7 : 1 }]}
      onPress={() => setShowCreate(true)}
      hitSlop={6}
    >
      <Ionicons name="add" size={20} color="#fff" />
    </Pressable>
  );

  const headerTitle = selection.selectionMode
    ? selection.count > 0
      ? tu.selectUsers.replace("{n}", String(selection.count))
      : tu.selectUsers.replace("{n}", "")
    : tu.pageTitle;

  return (
    <View style={styles.root}>
      <AdminHeader
        title={headerTitle}
        left={selection.selectionMode ? cancelBtn : undefined}
        right={selection.selectionMode ? selectionActions : undefined}
        rightExtra={!selection.selectionMode ? addIconBtn : undefined}
      />

      {!selection.selectionMode && (
        <View style={styles.filterArea}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={T.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={tu.searchPlaceholder}
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
            <Pressable
              style={({ pressed }) => [styles.selectModeBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => selection.enterSelection()}
              hitSlop={6}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={T.textSec} />
            </Pressable>
          </View>

          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              <FilterButton icon="business-outline" label={tu.filterClinic} value={selectedClinicName} onPress={() => setPickerOpen("clinic")} />
              <FilterButton icon="person-outline" label={tu.filterType} value={entityTypeFilter !== "ALL" ? entityTypeFilter : undefined} onPress={() => setPickerOpen("type")} />
              <FilterButton icon="checkmark-circle-outline" label={tu.filterStatus} value={statusFilter !== "ALL" ? statusFilter : undefined} onPress={() => setPickerOpen("status")} />
              {hasFilters && (
                <Pressable style={styles.clearBtn} onPress={clearAllFilters}>
                  <Ionicons name="refresh-outline" size={13} color={T.textSec} />
                  <Text style={styles.clearBtnText}>{tu.clearFilters}</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>

          <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />
        </View>
      )}

      {isLoading ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.entityType}-${item.id}`}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 80 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          scrollEnabled={rows.length > 0}
          ListHeaderComponent={
            data ? (
              <Text style={styles.countLabel}>
                {data.total === 1 ? tu.countOne : tu.countMany.replace("{n}", String(data.total))}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={tu.emptyTitle}
              subtitle={hasFilters ? tu.emptySubFilter : tu.emptySubNoUsers}
              action={
                hasFilters ? (
                  <Pressable style={styles.clearFiltersBtn} onPress={clearAllFilters}>
                    <Text style={styles.clearFiltersBtnText}>{tu.clearFilters}</Text>
                  </Pressable>
                ) : undefined
              }
            />
          }
          renderItem={({ item }) => {
            const compositeId = `${item.entityType}::${item.id}`;
            return (
              <UserListRowCard
                item={item}
                selectionMode={selection.selectionMode}
                isSelected={selection.isSelected(compositeId)}
                onPress={() => handleRowPress(item, compositeId)}
                onLongPress={() => handleLongPress(compositeId)}
              />
            );
          }}
        />
      )}

      <BulkDeleteModal
        visible={showDeleteModal}
        count={selection.count}
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDeactivate}
        onCancel={() => setShowDeleteModal(false)}
      />

      <DangerPurgeModal
        visible={showPurgeModal}
        count={selection.count}
        isLoading={isPurging}
        onConfirm={handleBulkPurge}
        onCancel={() => setShowPurgeModal(false)}
      />

      <FilterPickerModal
        visible={pickerOpen === "clinic"}
        title={tu.filterByClinic}
        options={clinicOptions}
        selected={clinicFilter}
        onSelect={setClinicFilter}
        onClose={() => setPickerOpen(null)}
        searchable={clinicOptions.length > 6}
        allLabel={tu.allClinics}
      />
      <FilterPickerModal
        visible={pickerOpen === "type"}
        title={tu.filterByType}
        options={typeOptions}
        selected={entityTypeFilter !== "ALL" ? entityTypeFilter : ""}
        onSelect={(v) => setEntityTypeFilter((v || "ALL") as EntityType)}
        onClose={() => setPickerOpen(null)}
        allLabel={tu.allTypes}
      />
      <FilterPickerModal
        visible={pickerOpen === "status"}
        title={tu.filterByStatus}
        options={statusOptions}
        selected={statusFilter !== "ALL" ? statusFilter : ""}
        onSelect={(v) => setStatusFilter((v || "ALL") as StatusFilter)}
        onClose={() => setPickerOpen(null)}
        allLabel={tu.allStatuses}
      />

      <PatientSummarySheet
        patientId={patientSheetId}
        onClose={() => setPatientSheetId(null)}
        onUpdated={() => invalidateUsers()}
      />

      <CreateUserSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        defaultRole="MANAGER"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  headerSelectionActions: { flexDirection: "row", alignItems: "center", gap: 8 },

  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    flexShrink: 0,
  },

  selectAllBtn: {
    width: "auto" as any,
    paddingHorizontal: 12,
  },
  selectAllText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: T.accent,
  },

  cancelIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    flexShrink: 0,
  },

  addIconBtn: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: T.r8,
    backgroundColor: T.primary,
    flexShrink: 0,
  },

  selectModeBtn: {
    width: 32,
    height: 32,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: T.r8,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    flexShrink: 0,
  },

  trashBtn: {
    width: 34,
    height: 34,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: T.r8,
    backgroundColor: T.warning,
    flexShrink: 0,
  },
  purgeBtn: {
    width: 34,
    height: 34,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: T.r8,
    backgroundColor: "#b91c1c",
    flexShrink: 0,
  },
  actionBtnDisabled: {
    backgroundColor: T.border,
  },

  filterArea: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  searchInput: { flex: 1, fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text },
  filterRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  filterScroll: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 7,
    flexDirection: "row",
    alignItems: "center",
  },
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
  clearBtnText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 12.5, color: T.textSec },

  countLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  list: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },

  skeletonList: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 12,
    height: 86,
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF0F5",
    flexShrink: 0,
  },
  skeletonInfo: { flex: 1, gap: 4 },
  skeletonLine: { backgroundColor: "#EEF0F5", borderRadius: 4 },
  skeletonChips: { flexDirection: "row", gap: 5, marginTop: 4 },
  skeletonChip: { height: 18, backgroundColor: "#EEF0F5", borderRadius: 4 },
  clearFiltersBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: T.r10,
    borderWidth: 1.5,
    borderColor: T.accent + "40",
    backgroundColor: T.accent + "08",
  },
  clearFiltersBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: T.accent,
  },
});
