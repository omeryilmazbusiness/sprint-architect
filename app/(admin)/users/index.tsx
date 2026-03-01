import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  useColorScheme,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Clipboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Colors from "@/constants/colors";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { listUsers, createUser, AdminUser, AdminUserCreated, UserListResponse } from "@/lib/api/adminUsers";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

const ROLE_FILTERS = ["ALL", "ADMIN", "MANAGER"] as const;
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const;

export default function UsersScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;
  const params = useLocalSearchParams<{ preselectedClinicId?: string }>();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [clinicFilter, setClinicFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [newClinicId, setNewClinicId] = useState(params.preselectedClinicId ?? "");

  useEffect(() => {
    if (params.preselectedClinicId) {
      setNewClinicId(params.preselectedClinicId);
      setShowCreate(true);
    }
  }, [params.preselectedClinicId]);

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => setDebouncedSearch(text), 300);
    setDebounceTimer(t);
  }

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<UserListResponse>({
    queryKey: ["/v1/admin/users", debouncedSearch, roleFilter, statusFilter, clinicFilter],
    queryFn: () =>
      listUsers({
        search: debouncedSearch || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
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
    if (newRole === "MANAGER" && !newClinicId) return Alert.alert("Validation", "Clinic is required for Manager role");
    createMutation.mutate({
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      clinicId: newClinicId || null,
    });
  }

  function copyPassword() {
    if (Clipboard?.setString) Clipboard.setString(generatedPassword);
    Alert.alert("Copied", "Password copied to clipboard.");
  }

  if (isLoading) return <LoadingView message="Loading users..." />;
  if (isError) return <ErrorView onRetry={refetch} />;

  const clinics = clinicsData?.rows ?? [];
  const selectedClinic = clinics.find((c) => c.id === clinicFilter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Users</Text>
          <Text style={[styles.count, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
            {data?.total ?? 0} total
          </Text>
        </View>

        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Search by email..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, { borderColor: clinicFilter ? colors.accent : colors.border, backgroundColor: clinicFilter ? colors.accent + "18" : "transparent" }]}
            onPress={() => {
              if (clinicFilter) { setClinicFilter(""); return; }
            }}
          >
            <Ionicons name="business-outline" size={13} color={clinicFilter ? colors.accent : colors.textSecondary} />
            <Text style={[styles.filterChipText, { color: clinicFilter ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {selectedClinic ? selectedClinic.name : "All Clinics"}
            </Text>
            {clinicFilter ? <Ionicons name="close" size={13} color={colors.accent} /> : null}
          </Pressable>

          {ROLE_FILTERS.map((r) => (
            <Pressable
              key={r}
              style={[styles.filterChip, { borderColor: roleFilter === r ? colors.accent : colors.border, backgroundColor: roleFilter === r ? colors.accent + "18" : "transparent" }]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[styles.filterChipText, { color: roleFilter === r ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{r}</Text>
            </Pressable>
          ))}

          {STATUS_FILTERS.filter((s) => s !== "ALL").map((s) => {
            const c = s === "ACTIVE" ? colors.success : s === "SUSPENDED" ? colors.error : colors.textMuted;
            return (
              <Pressable
                key={s}
                style={[styles.filterChip, { borderColor: statusFilter === s ? c : colors.border, backgroundColor: statusFilter === s ? c + "18" : "transparent" }]}
                onPress={() => setStatusFilter(statusFilter === s ? "ALL" : s)}
              >
                <Text style={[styles.filterChipText, { color: statusFilter === s ? c : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {clinics.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clinicFilterRow}>
            <Pressable
              style={[styles.clinicChip, { borderColor: !clinicFilter ? colors.accent : colors.border, backgroundColor: !clinicFilter ? colors.accent + "18" : "transparent" }]}
              onPress={() => setClinicFilter("")}
            >
              <Text style={[styles.clinicChipText, { color: !clinicFilter ? colors.accent : colors.textSecondary, fontFamily: "Inter_400Regular" }]}>All</Text>
            </Pressable>
            {clinics.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.clinicChip, { borderColor: clinicFilter === c.id ? colors.accent : colors.border, backgroundColor: clinicFilter === c.id ? colors.accent + "18" : "transparent" }]}
                onPress={() => setClinicFilter(clinicFilter === c.id ? "" : c.id)}
              >
                <Text style={[styles.clinicChipText, { color: clinicFilter === c.id ? colors.accent : colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        scrollEnabled={!!(data?.rows?.length)}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No users found" subtitle="Adjust filters or tap + to create a user" />}
        renderItem={({ item }) => {
          const statusDotColor = item.status === "ACTIVE" ? colors.success : item.status === "SUSPENDED" ? colors.error : colors.statusInactive;
          return (
            <Pressable
              style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => router.push({ pathname: "/(admin)/users/[id]", params: { id: item.id } })}
            >
              <View style={styles.cardRow}>
                <View style={[styles.avatar, { backgroundColor: colors.accent + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                    {item.email.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardEmail, { color: colors.text, fontFamily: "Inter_500Medium" }]} numberOfLines={1}>
                    {item.email}
                  </Text>
                  <View style={styles.cardMeta}>
                    <RoleBadge role={item.role} colors={colors} />
                    {item.clinic && (
                      <Text style={[styles.clinicName, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                        {item.clinic.name}
                      </Text>
                    )}
                    {item.mustChangePassword && (
                      <View style={[styles.pwBadge, { backgroundColor: colors.warning + "20" }]}>
                        <Text style={[styles.pwBadgeText, { color: colors.warning, fontFamily: "Inter_500Medium" }]}>temp pw</Text>
                      </View>
                    )}
                    {item.status === "SUSPENDED" && (
                      <View style={[styles.pwBadge, { backgroundColor: colors.error + "15" }]}>
                        <Text style={[styles.pwBadgeText, { color: colors.error, fontFamily: "Inter_500Medium" }]}>SUSPENDED</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.statusDot, { backgroundColor: statusDotColor }]} />
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => setShowCreate(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
            <View style={[styles.modal, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>New User</Text>

              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
                placeholder="Email address *"
                placeholderTextColor={colors.textMuted}
                value={newEmail}
                onChangeText={setNewEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <View style={[styles.infoBox, { backgroundColor: colors.accent + "10", borderColor: colors.accent + "30" }]}>
                <Ionicons name="key-outline" size={14} color={colors.accent} />
                <Text style={[styles.infoText, { color: colors.accent, fontFamily: "Inter_400Regular" }]}>
                  A secure password will be generated automatically
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Role</Text>
              <View style={styles.roleRow}>
                {(["MANAGER", "ADMIN"] as const).map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.roleOption, { borderColor: newRole === r ? colors.accent : colors.border, backgroundColor: newRole === r ? colors.accent + "18" : "transparent" }]}
                    onPress={() => setNewRole(r)}
                  >
                    <Text style={[styles.roleOptionText, { color: newRole === r ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{r}</Text>
                  </Pressable>
                ))}
              </View>

              {newRole === "MANAGER" && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Clinic *</Text>
                  <ScrollView style={styles.clinicPicker} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {clinics.map((c) => (
                      <Pressable
                        key={c.id}
                        style={[styles.clinicOption, { borderColor: newClinicId === c.id ? colors.accent : colors.border, backgroundColor: newClinicId === c.id ? colors.accent + "18" : "transparent" }]}
                        onPress={() => setNewClinicId(c.id)}
                      >
                        <Text style={[styles.clinicOptionText, { color: newClinicId === c.id ? colors.accent : colors.text, fontFamily: "Inter_400Regular" }]}>{c.name}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={styles.modalButtons}>
                <Pressable style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setShowCreate(false); resetForm(); }}>
                  <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, { backgroundColor: colors.accent, borderColor: colors.accent, opacity: createMutation.isPending ? 0.7 : 1 }]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : (
                    <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Create</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPassword} transparent animationType="fade">
        <View style={[styles.overlay, { justifyContent: "center" }]}>
          <View style={[styles.passwordModal, { backgroundColor: colors.card }]}>
            <View style={[styles.pwIconWrap, { backgroundColor: colors.success + "20" }]}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.success} />
            </View>
            <Text style={[styles.pwTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>User Created</Text>
            <Text style={[styles.pwSub, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Save this password — it will only be shown once.
            </Text>
            <View style={[styles.pwBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.pwValue, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} selectable>
                {generatedPassword}
              </Text>
              <Pressable style={styles.copyBtn} onPress={copyPassword}>
                <Ionicons name="copy-outline" size={18} color={colors.accent} />
              </Pressable>
            </View>
            <Pressable style={[styles.confirmRow, { borderColor: colors.border }]} onPress={() => setConfirmed(!confirmed)}>
              <View style={[styles.checkbox, { borderColor: confirmed ? colors.success : colors.border, backgroundColor: confirmed ? colors.success : "transparent" }]}>
                {confirmed && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={[styles.confirmText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                I have saved this password
              </Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, { backgroundColor: confirmed ? colors.accent : colors.accent + "50" }]}
              onPress={() => { if (confirmed) setShowPassword(false); }}
              disabled={!confirmed}
            >
              <Text style={[styles.confirmBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RoleBadge({ role, colors }: { role: string; colors: typeof Colors.light }) {
  const color = role === "ADMIN" ? colors.warning : colors.accent;
  return (
    <View style={[styles.roleBadge, { backgroundColor: color + "20" }]}>
      <Text style={[styles.roleBadgeText, { color, fontFamily: "Inter_600SemiBold" }]}>{role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 26 },
  count: { fontSize: 13 },
  searchInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 8 },
  filterRow: { marginBottom: 4 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 13 },
  clinicFilterRow: { marginBottom: 4, marginTop: 4 },
  clinicChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginRight: 6, maxWidth: 120 },
  clinicChipText: { fontSize: 12 },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16 },
  cardInfo: { flex: 1, gap: 4 },
  cardEmail: { fontSize: 14 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  roleBadgeText: { fontSize: 11, letterSpacing: 0.3 },
  clinicName: { fontSize: 12, flex: 1 },
  pwBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  pwBadgeText: { fontSize: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  fab: { position: "absolute", bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  overlayScroll: { justifyContent: "flex-end", flexGrow: 1 },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, marginBottom: 4 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  infoText: { flex: 1, fontSize: 13 },
  roleRow: { flexDirection: "row", gap: 8 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  roleOptionText: { fontSize: 13 },
  clinicPicker: { maxHeight: 140, borderWidth: 1, borderRadius: 10, borderColor: "transparent" },
  clinicOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  clinicOptionText: { fontSize: 14 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
  passwordModal: { borderRadius: 20, padding: 24, marginHorizontal: 24, alignItems: "center", gap: 14 },
  pwIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  pwTitle: { fontSize: 22 },
  pwSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  pwBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, width: "100%", gap: 12 },
  pwValue: { flex: 1, fontSize: 16, letterSpacing: 1 },
  copyBtn: { padding: 4 },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%", borderWidth: 1, borderRadius: 12, padding: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  confirmText: { flex: 1, fontSize: 14 },
  confirmBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", width: "100%" },
  confirmBtnText: { color: "#fff", fontSize: 16 },
});
