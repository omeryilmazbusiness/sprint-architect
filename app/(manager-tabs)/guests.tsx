import React, { useState, useCallback, useEffect } from "react";
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
}

interface PatientListResponse {
  rows: Patient[];
  total: number;
  page: number;
  pageSize: number;
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

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
      onPress={onPress}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{patient.fullName}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {patient.patientKey} · {patient.nationality ?? "—"}
        </Text>
        {patient.arrivalDate && (
          <Text style={styles.rowDate}>
            {formatDate(patient.arrivalDate)} → {formatDate(patient.departureDate)}
          </Text>
        )}
      </View>
      <View style={styles.rowRight}>
        <StatusPill status={patient.status} small />
        <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
      </View>
    </Pressable>
  );
}

export default function GuestsScreen() {
  const params = useLocalSearchParams<{ openCreate?: string }>();
  const [search, setSearch] = useState("");
  const [page] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    nationality: "",
    arrivalDate: "",
    departureDate: "",
  });
  const qc = useQueryClient();
  const { logout } = useAuth();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (params.openCreate === "1") setShowCreate(true);
  }, [params.openCreate]);

  const { data, isLoading, refetch, isRefetching } = useQuery<PatientListResponse>({
    queryKey: ["/v1/manager/patients", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "30" });
      if (search.trim()) params.set("search", search.trim());
      const res = await apiRequest("GET", `/v1/manager/patients?${params.toString()}`);
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

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const rows = data?.rows ?? [];

  return (
    <View style={styles.root}>
      <ManagerHeader title="Guests" onLogout={handleLogout} />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search guests..."
          placeholderTextColor={T.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
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
                {search ? "No guests match your search." : "No guests yet. Add your first guest."}
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp8,
    gap: T.sp8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: T.text,
    height: 36,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    backgroundColor: T.surface,
    gap: T.sp12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: T.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: T.primary,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontFamily: "Inter_600SemiBold" as any, fontSize: 15, color: T.text },
  rowMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted },
  rowDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted },
  rowRight: { flexDirection: "row", alignItems: "center", gap: T.sp8 },
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
