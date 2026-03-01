import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Clipboard,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { StatusPill, EmptyState, LoadingState, ErrorState, TextField, Divider } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import {
  listUnifiedEntities, createUser, UnifiedEntity, UnifiedListResponse,
  AdminUserCreated, CreateUserInput,
} from "@/lib/api/adminUsers";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

type EntityType = "ALL" | "MANAGER" | "PATIENT" | "ADMIN";
const ENTITY_FILTERS: EntityType[] = ["ALL", "MANAGER", "PATIENT", "ADMIN"];
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const;

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
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ preselectedClinicId?: string }>();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType>("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [clinicFilter, setClinicFilter] = useState<string>(params.preselectedClinicId ?? "");

  const [showCreate, setShowCreate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [newClinicId, setNewClinicId] = useState(params.preselectedClinicId ?? "");

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => setDebouncedSearch(text), 300);
    setDebounceTimer(t);
  }

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
    queryKey: ["/v1/admin/clinics", ""],
    queryFn: () => listClinics({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (result: AdminUserCreated) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      setShowCreate(false);
      setGeneratedPassword(result.generatedPassword);
      setConfirmed(false);
      setShowPassword(true);
      resetForm();
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to create user"),
  });

  function resetForm() {
    setNewEmail("");
    setNewRole("MANAGER");
    setNewClinicId("");
  }

  function handleCreate() {
    if (!newEmail.trim()) return Alert.alert("Validation", "Email is required");
    if (newRole === "MANAGER" && !newClinicId) return Alert.alert("Validation", "Clinic is required for Manager");
    createMutation.mutate({ email: newEmail.trim().toLowerCase(), role: newRole, clinicId: newClinicId || null });
  }

  function copyPassword() {
    if (Clipboard?.setString) Clipboard.setString(generatedPassword);
    Alert.alert("Copied", "Password copied to clipboard.");
  }

  async function handleLogout() { await logout(); router.replace("/(auth)/login"); }

  const clinics = clinicsData?.rows ?? [];

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
            onChangeText={handleSearchChange}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={T.textMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {ENTITY_FILTERS.map((f) => {
            const c = f === "ALL" ? T.primary : entityAccent(f);
            const active = entityTypeFilter === f;
            return (
              <Pressable
                key={f}
                style={[styles.chip, active ? { backgroundColor: c + "15", borderColor: c } : styles.chipInactive]}
                onPress={() => setEntityTypeFilter(f)}
              >
                {f !== "ALL" && <Ionicons name={entityIcon(f) as any} size={11} color={active ? c : T.textMuted} />}
                <Text style={[styles.chipText, { color: active ? c : T.textSec }]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {STATUS_FILTERS.map((s) => {
            const active = statusFilter === s;
            const c = s === "ACTIVE" ? T.success : s === "INACTIVE" ? T.textSec : s === "SUSPENDED" ? T.danger : T.primary;
            return (
              <Pressable
                key={s}
                style={[styles.chip, active ? { backgroundColor: c + "15", borderColor: c } : styles.chipInactive]}
                onPress={() => setStatusFilter(s)}
              >
                <Text style={[styles.chipText, { color: active ? c : T.textSec }]}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {clinics.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            <Pressable
              style={[styles.chip, !clinicFilter ? styles.chipActive : styles.chipInactive]}
              onPress={() => setClinicFilter("")}
            >
              <Text style={[styles.chipText, { color: !clinicFilter ? T.primary : T.textSec }]}>All Clinics</Text>
            </Pressable>
            {clinics.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, clinicFilter === c.id ? styles.chipActive : styles.chipInactive]}
                onPress={() => setClinicFilter(clinicFilter === c.id ? "" : c.id)}
              >
                <Text style={[styles.chipText, { color: clinicFilter === c.id ? T.primary : T.textSec }]} numberOfLines={1}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
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

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.sheetTitle}>New Staff User</Text>
                <Pressable onPress={() => { setShowCreate(false); resetForm(); }} hitSlop={10}>
                  <Ionicons name="close" size={22} color={T.textSec} />
                </Pressable>
              </View>
              <View style={styles.sheetBody}>
                <TextField
                  label="Email Address *"
                  placeholder="user@clinic.com"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.infoBadge}>
                  <Ionicons name="key-outline" size={14} color={T.accent} />
                  <Text style={styles.infoText}>A secure password will be generated automatically</Text>
                </View>
                <Text style={styles.fieldLabel}>ROLE</Text>
                <View style={styles.roleRow}>
                  {(["MANAGER", "ADMIN"] as const).map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.roleOption, newRole === r ? styles.roleOptionActive : styles.roleOptionInactive]}
                      onPress={() => setNewRole(r)}
                    >
                      <Text style={[styles.roleOptionText, { color: newRole === r ? T.primary : T.textSec }]}>{r}</Text>
                    </Pressable>
                  ))}
                </View>
                {newRole === "MANAGER" && (
                  <>
                    <Text style={styles.fieldLabel}>CLINIC *</Text>
                    <ScrollView style={styles.clinicPicker} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                      {clinics.map((c) => (
                        <Pressable
                          key={c.id}
                          style={[styles.clinicOption, newClinicId === c.id ? styles.clinicOptionActive : styles.clinicOptionInactive]}
                          onPress={() => setNewClinicId(c.id)}
                        >
                          <Text style={[styles.clinicOptionText, { color: newClinicId === c.id ? T.primary : T.text }]} numberOfLines={1}>{c.name}</Text>
                          {newClinicId === c.id && <Ionicons name="checkmark" size={14} color={T.primary} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </>
                )}
                <View style={styles.sheetBtns}>
                  <Pressable style={styles.cancelBtn} onPress={() => { setShowCreate(false); resetForm(); }}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.createBtn, { opacity: createMutation.isPending ? 0.7 : 1 }]}
                    onPress={handleCreate}
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>Create</Text>}
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPassword} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.pwModal}>
            <View style={styles.pwIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={32} color={T.success} />
            </View>
            <Text style={styles.pwTitle}>User Created</Text>
            <Text style={styles.pwSub}>Save this password — it will only be shown once.</Text>
            <View style={styles.pwBox}>
              <Text style={styles.pwValue} selectable>{generatedPassword}</Text>
              <Pressable style={styles.copyBtn} onPress={copyPassword}>
                <Ionicons name="copy-outline" size={18} color={T.accent} />
              </Pressable>
            </View>
            <Pressable style={styles.confirmRow} onPress={() => setConfirmed(!confirmed)}>
              <View style={[styles.checkbox, { borderColor: confirmed ? T.success : T.border, backgroundColor: confirmed ? T.success : "transparent" }]}>
                {confirmed && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={styles.confirmText}>I have saved this password</Text>
            </Pressable>
            <Pressable
              style={[styles.doneBtn, { backgroundColor: confirmed ? T.primary : T.primary + "50" }]}
              onPress={() => { if (confirmed) setShowPassword(false); }}
              disabled={!confirmed}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  filterArea: { backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, gap: 2, paddingBottom: 6 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: T.border },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  chipsScroll: { paddingHorizontal: 16, paddingVertical: 3 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 7 },
  chipActive: { backgroundColor: T.primary + "12", borderColor: T.primary },
  chipInactive: { backgroundColor: "transparent", borderColor: T.border },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 12 },
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
