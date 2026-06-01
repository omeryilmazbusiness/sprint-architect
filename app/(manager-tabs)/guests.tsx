import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { StatusPill, Divider } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { getCountryByCode } from "@/constants/countries";
import GuestListCard from "@/components/managerUsers/GuestListCard";
import { CreateGuestSheet } from "@/components/managerGuests/CreateGuestSheet";
import DoctorListCard from "@/components/managerDoctors/DoctorListCard";
import {
  ManagerFilterSheet,
  type GuestFilterState,
  DEFAULT_GUEST_FILTERS,
} from "@/components/filters/ManagerFilterSheet";
import { ActiveFilterChips, type ActiveChip } from "@/components/filters/ActiveFilterChips";
import { useT } from "@/hooks/useT";

type TabType = "Guests" | "Doctors" | "Pending Docs";

type DocFilter = "ALL" | "HAS_PENDING" | "FULLY_UPLOADED" | "HAS_REJECTED";

interface DocSummaryItem {
  patientId: string;
  patientName: string;
  pending: number;
  uploaded: number;
  approved: number;
  rejected: number;
  total: number;
  pendingDocNames: string[];
}

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  phone?: string;
  phoneE164?: string | null;
  email?: string | null;
  nationality?: string;
  nationalityCode?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  status: "ACTIVE" | "INACTIVE" | "PENDING" | "APPROVED" | "ENDED" | "WAITING_APPROVAL";
  createdAt?: string;
  pendingDocCount?: number;
  hasPendingDocs?: boolean;
  hasTodayAppointment?: boolean;
  plan?: {
    hotelId: string | null;
    transportId: string | null;
    doctorId: string | null;
  } | null;
}

interface PatientListResponse {
  items: Patient[];
  totalCount: number;
  page: number;
  pageSize: number;
}

interface Doctor {
  id: string;
  fullName: string;
  specialty: string;
  phone: string;
}

interface DoctorListResponse {
  rows: Doctor[];
}

function formatDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SkeletonCard() {
  return (
    <View style={skeletonStyles.card}>
      <View style={skeletonStyles.topRow}>
        <View style={skeletonStyles.avatar} />
        <View style={skeletonStyles.lines}>
          <View style={[skeletonStyles.line, { width: "60%" }]} />
          <View style={[skeletonStyles.line, { width: "40%", marginTop: 6 }]} />
        </View>
        <View style={[skeletonStyles.line, { width: 56, height: 20, borderRadius: 10 }]} />
      </View>
      <View style={[skeletonStyles.line, { width: "50%", height: 12 }]} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: T.sp16,
    marginBottom: T.sp12,
    padding: T.sp16,
    gap: 12,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: T.sp12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.border },
  lines: { flex: 1, gap: 6 },
  line: { height: 13, backgroundColor: T.border, borderRadius: 6 },
});


function GuestsTab() {
  const params = useLocalSearchParams<{ openCreate?: string }>();
  const t = useT();
  const tu = t.managerUsers;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<GuestFilterState>(DEFAULT_GUEST_FILTERS);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [page] = useState(1);

  const [showCreate, setShowCreate] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (params.openCreate === "1") setShowCreate(true);
  }, [params.openCreate]);

  const { data, isLoading, refetch, isRefetching } = useQuery<PatientListResponse>({
    queryKey: ["/v1/manager/patients", debouncedSearch, filters.status, filters.pendingDocs, filters.todayAppt, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
      if (filters.status !== "ALL") p.set("status", filters.status);
      if (filters.pendingDocs) p.set("pendingDocs", "true");
      if (filters.todayAppt) p.set("todayAppt", "true");
      const res = await apiRequest("GET", `/v1/manager/patients?${p.toString()}`);
      return res.json();
    },
  });

  const rows = data?.items ?? [];
  const hasActiveFilters =
    filters.status !== "ALL" || filters.pendingDocs || filters.todayAppt;

  function clearAllFilters() {
    setFilters(DEFAULT_GUEST_FILTERS);
  }

  const tf = t.filterSheet;
  const statusChipLabels: Record<string, string> = {
    WAITING_APPROVAL: tf.statusWaitingApproval,
    PENDING: tf.statusPending,
    APPROVED: tf.statusApproved,
    ACTIVE: tf.statusActive,
    ENDED: tf.statusEnded,
  };

  const activeChips: ActiveChip[] = [];
  if (filters.status !== "ALL") {
    activeChips.push({
      key: "status",
      label: statusChipLabels[filters.status] ?? filters.status,
      variant: "primary",
      onRemove: () => setFilters((f) => ({ ...f, status: "ALL" })),
    });
  }
  if (filters.pendingDocs) {
    activeChips.push({
      key: "pendingDocs",
      label: tu.tagDocsPending,
      variant: "warn",
      onRemove: () => setFilters((f) => ({ ...f, pendingDocs: false })),
    });
  }
  if (filters.todayAppt) {
    activeChips.push({
      key: "todayAppt",
      label: tu.tagTodayAppt,
      variant: "accent",
      onRemove: () => setFilters((f) => ({ ...f, todayAppt: false })),
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <View style={styles.searchBarRow}>
          <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}>
            <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={tu.searchGuestsPlaceholder}
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={T.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => setShowFilterSheet(true)}
            style={({ pressed }) => [styles.filterIconBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="options-outline" size={20} color={hasActiveFilters ? T.primary : T.textSec} />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </Pressable>
        </View>
      </View>
      <ActiveFilterChips chips={activeChips} onClearAll={clearAllFilters} />

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: T.sp16, paddingBottom: 100 }}>
          {[1, 2, 3, 4].map((k) => <SkeletonCard key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingTop: T.sp12, paddingBottom: bottomPad + 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListHeaderComponent={
            data?.totalCount != null ? (
              <Text style={styles.listCount}>
                {tu.guestsCountLabel.replace("{n}", String(data.totalCount))}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={T.border} />
              <Text style={styles.emptyTitle}>
                {search || hasActiveFilters ? tu.emptyGuestsTitle : tu.emptyGuestsTitleNoData}
              </Text>
              <Text style={styles.emptyText}>
                {search || hasActiveFilters ? tu.emptyGuestsSub : tu.emptyGuestsSubNoData}
              </Text>
              {hasActiveFilters && (
                <Pressable onPress={clearAllFilters} style={styles.clearFiltersBtn}>
                  <Text style={styles.clearFiltersBtnText}>{tu.clearFilters}</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <GuestListCard
              patient={item}
              flagEmoji={item.nationalityCode ? getCountryByCode(item.nationalityCode)?.flag ?? null : null}
              onPress={() => router.push({ pathname: "/(manager)/patients/[id]", params: { id: item.id } })}
            />
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => setShowCreate(true)}
        testID="fab-add-guest"
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <CreateGuestSheet visible={showCreate} onClose={() => setShowCreate(false)} />

      <ManagerFilterSheet
        visible={showFilterSheet}
        current={filters}
        onApply={(f) => setFilters(f)}
        onClose={() => setShowFilterSheet(false)}
      />
    </View>
  );
}

function DoctorsTab() {
  const t = useT();
  const tu = t.managerUsers;
  const td = t.managerDoctors;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const qc = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 2000 : 1200);
  }

  const { data, isLoading, refetch, isRefetching } = useQuery<DoctorListResponse | Doctor[]>({
    queryKey: ["/v1/manager/doctors", debouncedSearch],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
      const res = await apiRequest("GET", `/v1/manager/doctors?${p.toString()}`);
      return res.json();
    },
  });

  const rows = useMemo(() => {
    if (!data) return [];
    const all = Array.isArray(data) ? data : (data as DoctorListResponse).rows ?? [];
    return all.filter((d) => !deletedIds.has(d.id));
  }, [data, deletedIds]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/doctors/${id}`);
    },
    onSuccess: (_data, id) => {
      setDeletedIds((prev) => new Set(prev).add(id));
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"], exact: false });
      setTimeout(() => showToast(td.toastDoctorRemoved), 50);
    },
    onError: (e: any) => {
      if (e?.code === "DOC-DEL-001") {
        showToast(td.toastHasAppointments, "error");
      } else {
        showToast(e.message ?? td.toastFailedDelete, "error");
      }
    },
  });

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <View style={styles.searchBarRow}>
          <View style={[styles.searchBar, { flex: 1, marginHorizontal: 0, marginBottom: 0 }]}>
            <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={tu.searchDoctorsPlaceholder}
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={T.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={() => router.push("/(manager)/doctors")}
            style={({ pressed }) => [styles.filterIconBtn, styles.addDoctorBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: T.sp16, paddingBottom: 100 }}>
          {[1, 2, 3].map((k) => <SkeletonCard key={k} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingTop: T.sp12, paddingBottom: bottomPad + 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListHeaderComponent={
            rows.length > 0 ? (
              <Text style={styles.listCount}>
                {tu.doctorsCountLabel.replace("{n}", String(rows.length))}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="person-outline" size={40} color={T.border} />
              <Text style={styles.emptyTitle}>
                {debouncedSearch ? tu.emptyDoctorsTitle : td.emptyTitle}
              </Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? tu.emptyDoctorsSub : tu.emptyDoctorsSubNoSearch}
              </Text>
              {!debouncedSearch && (
                <Pressable
                  onPress={() => router.push("/(manager)/doctors")}
                  style={({ pressed }) => [styles.emptyAddBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={T.primary} />
                  <Text style={styles.emptyAddBtnText}>{tu.addDoctor}</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <DoctorListCard
              doctor={item as any}
              onEdit={() => router.push("/(manager)/doctors")}
              onDelete={handleDelete}
            />
          )}
        />
      )}

      <Modal
        visible={!!toast}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.toastOverlay} pointerEvents="none" testID="doctors-toast">
          <View
            style={[
              styles.toastBar,
              toast?.type === "error" ? styles.toastBarError : styles.toastBarSuccess,
            ]}
          >
            <Ionicons
              name={toast?.type === "error" ? "warning-outline" : "checkmark-circle-outline"}
              size={16}
              color="#fff"
            />
            <Text testID="doctors-toast-text" style={styles.toastText}>{toast?.msg}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DocStatusBadge({ count, color, label }: { count: number; color: string; label: string }) {
  if (count === 0) return null;
  return (
    <View style={[docStyles.badge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
      <Text style={[docStyles.badgeText, { color }]}>{count} {label}</Text>
    </View>
  );
}

function PendingDocsTab() {
  const t = useT();
  const tu = t.managerUsers;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [docFilter, setDocFilter] = useState<DocFilter>("HAS_PENDING");
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const DOC_FILTER_OPTIONS: { label: string; value: DocFilter }[] = [
    { label: tu.docFilterAll, value: "ALL" },
    { label: tu.docFilterPending, value: "HAS_PENDING" },
    { label: tu.docFilterUploaded, value: "FULLY_UPLOADED" },
    { label: tu.docFilterRejected, value: "HAS_REJECTED" },
  ];

  const { data, isLoading, isRefetching, refetch } = useQuery<DocSummaryItem[]>({
    queryKey: ["/v1/manager/patients/doc-summaries", debouncedSearch, docFilter],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set("search", debouncedSearch);
      p.set("filter", docFilter);
      const res = await apiRequest("GET", `/v1/manager/patients/doc-summaries?${p.toString()}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const items: DocSummaryItem[] = data ?? [];

  function renderItem({ item }: { item: DocSummaryItem }) {
    const hasRejected = item.rejected > 0;
    const hasPending = item.pending > 0;

    return (
      <Pressable
        style={({ pressed }) => [
          docStyles.card,
          cardShadow,
          hasRejected && docStyles.cardRejected,
          !hasRejected && hasPending && docStyles.cardPending,
          { opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={() => router.push(`/(manager)/patients/${item.patientId}` as any)}
      >
        <View style={docStyles.cardTop}>
          <View style={[docStyles.avatar, { backgroundColor: hasPending ? T.warning + "18" : T.accent + "14" }]}>
            <Text style={[docStyles.avatarText, { color: hasPending ? T.warning : T.accent }]}>
              {item.patientName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={docStyles.name} numberOfLines={1}>{item.patientName}</Text>
            <Text style={docStyles.totalLine}>{item.total} document{item.total !== 1 ? "s" : ""} total</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
        </View>

        <View style={docStyles.badgeRow}>
          <DocStatusBadge count={item.pending} color={T.warning} label={tu.docBadgePending} />
          <DocStatusBadge count={item.uploaded} color={T.accent} label={tu.docBadgeUploaded} />
          <DocStatusBadge count={item.approved} color={T.success} label={tu.docBadgeApproved} />
          <DocStatusBadge count={item.rejected} color={T.danger} label={tu.docBadgeRejected} />
        </View>

        {item.pendingDocNames.length > 0 && (
          <View style={docStyles.chipRow}>
            {item.pendingDocNames.slice(0, 3).map((name, i) => (
              <View key={i} style={docStyles.chip}>
                <Ionicons name="document-outline" size={10} color={T.warning} />
                <Text style={docStyles.chipText} numberOfLines={1}>{name}</Text>
              </View>
            ))}
            {item.pendingDocNames.length > 3 && (
              <Text style={docStyles.moreText}>+{item.pendingDocNames.length - 3} more</Text>
            )}
          </View>
        )}
      </Pressable>
    );
  }

  const docSuffix =
    docFilter === "HAS_PENDING" ? tu.docSuffixWithPending :
    docFilter === "FULLY_UPLOADED" ? tu.docSuffixWithUploaded :
    docFilter === "HAS_REJECTED" ? tu.docSuffixWithRejected :
    tu.docSuffixAll;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <View style={[styles.searchBar, { marginHorizontal: T.sp16, marginBottom: T.sp12 }]}>
          <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={tu.searchDocsPlaceholder}
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.statusFilters, { paddingHorizontal: T.sp16 }]}
        >
          {DOC_FILTER_OPTIONS.map((f) => (
            <Pressable
              key={f.value}
              style={[styles.filterPill, docFilter === f.value && styles.filterPillActive]}
              onPress={() => setDocFilter(f.value)}
            >
              <Text style={[styles.filterPillText, docFilter === f.value && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.accent} />
        </View>
      ) : (
        <FlatList<DocSummaryItem>
          data={items}
          keyExtractor={(item) => item.patientId}
          contentContainerStyle={{ padding: T.sp16, paddingBottom: bottomPad + 100, gap: T.sp12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListHeaderComponent={
            items.length > 0 ? (
              <Text style={styles.listCount}>
                {items.length} {items.length !== 1 ? tu.guestPlural : tu.guestSingular}{docSuffix}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="document-text-outline"
                size={40}
                color={T.border}
              />
              <Text style={styles.emptyTitle}>
                {debouncedSearch ? tu.docEmptySearchTitle : tu.docEmptyTitle}
              </Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? tu.docEmptySearchSub : tu.docEmptySub}
              </Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const docStyles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp16,
    borderWidth: 1,
    borderColor: T.border,
    gap: T.sp12,
  },
  cardPending: {
    borderColor: T.warning + "50",
    borderLeftWidth: 3,
    borderLeftColor: T.warning,
  },
  cardRejected: {
    borderColor: T.danger + "50",
    borderLeftWidth: 3,
    borderLeftColor: T.danger,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
  },
  name: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 15,
    color: T.text,
  },
  totalLine: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 11,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.warning + "40",
    backgroundColor: T.warningBg,
  },
  chipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    color: T.warning,
    flexShrink: 1,
  },
  moreText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 10,
    color: T.textMuted,
    alignSelf: "center",
  },
});

export default function GuestsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const t = useT();
  const tu = t.managerUsers;

  const [activeTab, setActiveTab] = useState<TabType>("Guests");
  const { logout } = useAuth();

  const tabLabels: Record<TabType, string> = {
    "Guests": tu.tabGuests,
    "Doctors": tu.tabDoctors,
    "Pending Docs": tu.tabPendingDocs,
  };

  useEffect(() => {
    if (params.tab === "Pending Docs") {
      setActiveTab("Pending Docs");
    }
  }, [params.tab]);

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.root}>
      <ManagerHeader title={t.managerTabLabels.guests} onLogout={handleLogout} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {(["Guests", "Doctors", "Pending Docs"] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tabLabels[tab]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {activeTab === "Guests" ? (
        <GuestsTab />
      ) : activeTab === "Doctors" ? (
        <DoctorsTab />
      ) : (
        <PendingDocsTab />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabsScroll: {
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabs: {
    flexDirection: "row",
    minWidth: "100%" as any,
  },
  tab: {
    paddingVertical: T.sp12,
    paddingHorizontal: T.sp20,
    alignItems: "center",
    minWidth: 90,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: T.primary,
  },
  tabText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.textMuted,
  },
  tabTextActive: {
    color: T.primary,
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
  },
  loader: { paddingTop: 60, alignItems: "center" },
  filterBar: {
    backgroundColor: T.surface,
    paddingTop: T.sp12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: T.sp16,
    marginBottom: T.sp12,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r10,
    paddingHorizontal: T.sp12,
    borderWidth: 1,
    borderColor: T.border,
    height: 40,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.text,
    height: 40,
  },
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.danger,
    borderWidth: 1.5,
    borderColor: T.surface,
  },
  addDoctorBtn: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: T.sp16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: T.r10,
    borderWidth: 1.5,
    borderColor: T.primary,
    backgroundColor: T.primary + "08",
  },
  emptyAddBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: T.primary,
  },
  statusFilters: {
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterPillActive: { backgroundColor: T.primary, borderColor: T.primary },
  filterPillText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, color: T.textSec },
  filterPillTextActive: { color: "#fff" },
  clearFiltersBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: T.r6,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  clearFiltersBtnText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, color: T.textSec },
  listCount: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 13,
    color: T.textMuted,
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp8,
    paddingTop: 4,
  },
  empty: { paddingTop: 72, alignItems: "center", gap: T.sp8, paddingHorizontal: T.sp32 },
  emptyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 16,
    color: T.text,
    textAlign: "center",
  },
  emptyText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center" },
  fab: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 34 + 84 + 16 : 84 + 16,
    right: T.sp20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
    elevation: 6,
  },
  toastOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: T.sp16,
    paddingBottom: Platform.OS === "web" ? 54 : 34,
  },
  toastBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: T.sp16,
    paddingVertical: 12,
    borderRadius: T.r10,
  },
  toastBarSuccess: { backgroundColor: T.success },
  toastBarError: { backgroundColor: T.danger },
  toastText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: "#fff",
  },
});
