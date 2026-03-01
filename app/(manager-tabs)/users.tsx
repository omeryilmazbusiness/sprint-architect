import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  Alert,
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

type TabType = "Guests" | "Doctors";

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  phone?: string;
  email?: string;
  nationality?: string;
  arrivalDate?: string;
  departureDate?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  createdAt: string;
  plan?: {
    hotelId: string | null;
    transportId: string | null;
    doctorId: string | null;
  };
}

interface PatientListResponse {
  rows: Patient[];
  total: number;
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

function GuestRow({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  const initials = patient.fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  const maskedKey = patient.patientKey.length > 8 
    ? `${patient.patientKey.slice(0, 4)}•••${patient.patientKey.slice(-4)}`
    : patient.patientKey;

  const missingTags = [];
  if (!patient.plan?.hotelId) missingTags.push("No Hotel");
  if (!patient.plan?.transportId) missingTags.push("No Transport");
  if (!patient.plan?.doctorId) missingTags.push("No Doctor");

  const colors = ["#0A3D62", "#0369A1", "#059669", "#D97706", "#DC2626", "#7C3AED", "#DB2777"];
  const colorIndex = patient.fullName.length % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor + "15" }]}>
        <Text style={[styles.avatarText, { color: avatarColor }]}>{initials}</Text>
      </View>
      <View style={styles.rowInfo}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowName} numberOfLines={1}>{patient.fullName}</Text>
          <StatusPill status={patient.status} small />
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {maskedKey} {patient.arrivalDate ? `· ✈ Arrival: ${formatDate(patient.arrivalDate)}` : ""}
        </Text>
        {missingTags.length > 0 && (
          <View style={styles.tagRow}>
            {missingTags.map((tag) => (
              <View key={tag} style={styles.missingTag}>
                <Text style={styles.missingTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
    </Pressable>
  );
}

function GuestsTab() {
  const params = useLocalSearchParams<{ openCreate?: string }>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [missingFilter, setMissingFilter] = useState<"ALL" | "missingHotel" | "missingTransport" | "missingDoctor" | "missingDocuments">("ALL");
  const [page] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    nationality: "",
    arrivalDate: "",
    departureDate: "",
  });
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (params.openCreate === "1") setShowCreate(true);
  }, [params.openCreate]);

  const { data, isLoading, refetch, isRefetching } = useQuery<PatientListResponse>({
    queryKey: ["/v1/manager/patients", debouncedSearch, statusFilter, missingFilter, page],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (debouncedSearch.trim()) p.set("search", debouncedSearch.trim());
      if (statusFilter !== "ALL") p.set("status", statusFilter);
      if (missingFilter !== "ALL") p.set("missing", missingFilter);
      const res = await apiRequest("GET", `/v1/manager/patients?${p.toString()}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const res = await apiRequest("POST", "/v1/manager/patients", body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/patients"] });
      qc.invalidateQueries({ queryKey: ["/v1/manager/metrics"] });
      setShowCreate(false);
      setForm({ fullName: "", phone: "", email: "", nationality: "", arrivalDate: "", departureDate: "" });
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to create guest"),
  });

  const rows = data?.rows ?? [];
  const hasActiveFilters = statusFilter !== "ALL" || missingFilter !== "ALL";
  const missingLabels: Record<string, string> = {
    missingHotel: "No Hotel",
    missingTransport: "No Transport",
    missingDoctor: "No Doctor",
    missingDocuments: "Missing Docs",
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search guests..."
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusFilters}>
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[
                styles.filterPill,
                statusFilter === s && styles.filterPillActive,
              ]}
            >
              <Text style={[styles.filterPillText, statusFilter === s && styles.filterPillTextActive]}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.missingFilters}>
          {(["ALL", "missingHotel", "missingTransport", "missingDoctor", "missingDocuments"] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMissingFilter(m)}
              style={[
                styles.filterChip,
                missingFilter === m && styles.filterChipActive,
              ]}
            >
              <Text style={[styles.filterChipText, missingFilter === m && styles.filterChipTextActive]}>
                {m === "ALL" ? "All Issues" : missingLabels[m]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {hasActiveFilters && (
          <View style={styles.activeFiltersRow}>
            {statusFilter !== "ALL" && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>{statusFilter}</Text>
                <Pressable onPress={() => setStatusFilter("ALL")}>
                  <Ionicons name="close" size={14} color={T.primary} />
                </Pressable>
              </View>
            )}
            {missingFilter !== "ALL" && (
              <View style={styles.activeChip}>
                <Text style={styles.activeChipText}>{missingLabels[missingFilter]}</Text>
                <Pressable onPress={() => setMissingFilter("ALL")}>
                  <Ionicons name="close" size={14} color={T.primary} />
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          ItemSeparatorComponent={() => <Divider inset={72} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>
                {search || hasActiveFilters ? "No guests match your filters." : "No guests yet. Add your first guest."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <GuestRow
              patient={item}
              onPress={() => router.push({ pathname: "/(manager)/patients/[id]", params: { id: item.id } })}
            />
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
        onPress={() => setShowCreate(true)}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>

      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Guest</Text>
            <Pressable onPress={() => setShowCreate(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {[
              { key: "fullName", label: "Full Name *", placeholder: "e.g. John Doe" },
              { key: "phone", label: "Phone", placeholder: "+1 555 000 0000" },
              { key: "email", label: "Email", placeholder: "john@example.com" },
              { key: "nationality", label: "Nationality", placeholder: "e.g. German" },
              { key: "arrivalDate", label: "Arrival Date", placeholder: "YYYY-MM-DD" },
              { key: "departureDate", label: "Departure Date", placeholder: "YYYY-MM-DD" },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={placeholder}
                  placeholderTextColor={T.textMuted}
                  value={form[key as keyof typeof form]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  autoCapitalize={key === "email" ? "none" : "words"}
                  keyboardType={key === "email" ? "email-address" : "default"}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.btnSecondary, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setShowCreate(false)}
            >
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                { opacity: pressed || createMutation.isPending ? 0.75 : 1 },
              ]}
              onPress={() => createMutation.mutate(form)}
              disabled={createMutation.isPending || !form.fullName.trim()}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Create Guest</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DoctorsTab() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

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
    if (Array.isArray(data)) return data;
    return data.rows ?? [];
  }, [data]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filterBar}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
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
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          ItemSeparatorComponent={() => <Divider inset={16} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="medical-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>
                {search ? "No doctors match your search." : "No doctors found."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.doctorCard, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => router.push("/(manager)/doctors")}
            >
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{item.fullName}</Text>
                <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
                <Text style={styles.doctorPhone}>{item.phone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

export default function UsersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>("Guests");
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.root}>
      <ManagerHeader title="Users" onLogout={handleLogout} />
      
      <View style={styles.segmentContainer}>
        <View style={styles.segmentBar}>
          {(["Guests", "Doctors"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.segmentBtn,
                activeTab === tab && styles.segmentBtnActive,
              ]}
            >
              <Text style={[
                styles.segmentText,
                activeTab === tab && styles.segmentTextActive,
              ]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === "Guests" ? <GuestsTab /> : <DoctorsTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  segmentContainer: {
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  segmentBar: {
    flexDirection: "row",
    backgroundColor: T.inactiveBg,
    borderRadius: T.r10,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: T.r8,
  },
  segmentBtnActive: {
    backgroundColor: T.primary,
    ...cardShadow,
  },
  segmentText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.textSec,
  },
  segmentTextActive: {
    color: "#fff",
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  filterBar: {
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp8,
    gap: T.sp8,
    borderBottomWidth: 1,
    borderBottomColor: T.border + "80",
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: T.text,
    height: 36,
  },
  statusFilters: {
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    gap: T.sp8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterPillActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  filterPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  filterPillTextActive: {
    color: "#fff",
  },
  missingFilters: {
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r6,
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterChipActive: {
    backgroundColor: T.primary + "10",
    borderColor: T.primary,
  },
  filterChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textSec,
  },
  filterChipTextActive: {
    color: T.primary,
  },
  activeFiltersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp12,
    gap: T.sp8,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.r4,
    gap: 6,
  },
  activeChipText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 11,
    color: T.primary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp16,
    backgroundColor: T.surface,
    gap: T.sp16,
  },
  rowTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  missingTag: {
    backgroundColor: T.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.dangerBorder,
  },
  missingTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    color: T.dangerText,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  rowInfo: { flex: 1 },
  rowName: { 
    fontFamily: "Inter_600SemiBold" as any, 
    fontSize: 16, 
    color: T.text,
    flex: 1,
    marginRight: 8,
  },
  rowMeta: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textMuted },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp16,
    backgroundColor: T.surface,
    gap: T.sp16,
  },
  doctorInfo: { flex: 1 },
  doctorName: { 
    fontFamily: "Inter_700Bold", 
    fontSize: 16, 
    color: T.text,
    marginBottom: 2,
  },
  doctorSpecialty: { 
    fontFamily: "Inter_500Medium", 
    fontSize: 14, 
    color: T.primary,
    marginBottom: 4,
  },
  doctorPhone: { 
    fontFamily: "Inter_400Regular", 
    fontSize: 13, 
    color: T.textMuted,
  },
  empty: {
    paddingTop: 80,
    alignItems: "center",
    gap: T.sp12,
    paddingHorizontal: T.sp32,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
  },
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
  modal: { flex: 1, backgroundColor: T.bg },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: T.sp20,
    paddingTop: T.sp24,
    paddingBottom: T.sp16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  modalScroll: { flex: 1 },
  modalContent: { padding: T.sp20, gap: T.sp16, paddingBottom: 40 },
  field: { gap: T.sp4 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  fieldInput: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 14,
    paddingVertical: T.sp12,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: T.text,
  },
  modalActions: {
    flexDirection: "row",
    padding: T.sp20,
    gap: T.sp12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: T.surface,
    ...(Platform.OS === "web" ? { paddingBottom: 34 } : {}),
  },
  btnSecondary: {
    flex: 1,
    height: 46,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
  btnSecondaryText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  btnPrimary: {
    flex: 2,
    height: 46,
    borderRadius: T.r10,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { fontFamily: "Inter_600SemiBold" as any, fontSize: 15, color: "#fff" },
});
