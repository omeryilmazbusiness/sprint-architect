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
  useColorScheme,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { listUsers, createUser, AdminUser, UserListResponse } from "@/lib/api/adminUsers";
import { listClinics, ClinicListResponse } from "@/lib/api/adminClinics";

const ROLE_FILTERS = ["ALL", "ADMIN", "MANAGER"];

export default function UsersScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [newClinicId, setNewClinicId] = useState("");

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => setDebouncedSearch(text), 300);
    setDebounceTimer(t);
  }

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<UserListResponse>({
    queryKey: ["/v1/admin/users", debouncedSearch, roleFilter],
    queryFn: () => listUsers({
      search: debouncedSearch || undefined,
      role: roleFilter !== "ALL" ? roleFilter : undefined,
    }),
  });

  const { data: clinicsData } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", ""],
    queryFn: () => listClinics({ pageSize: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      setShowCreate(false);
      resetForm();
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to create user"),
  });

  function resetForm() {
    setNewEmail(""); setNewPassword(""); setNewRole("MANAGER"); setNewClinicId("");
  }

  function handleCreate() {
    if (!newEmail.trim()) return Alert.alert("Validation", "Email is required");
    if (!newPassword.trim() || newPassword.length < 8) return Alert.alert("Validation", "Password must be at least 8 characters");
    if (newRole === "MANAGER" && !newClinicId) return Alert.alert("Validation", "Clinic is required for Manager role");
    createMutation.mutate({
      email: newEmail.trim().toLowerCase(),
      password: newPassword,
      role: newRole,
      clinicId: newClinicId || null,
    });
  }

  if (isLoading) return <LoadingView message="Loading users..." />;
  if (isError) return <ErrorView onRetry={refetch} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Users</Text>
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
          {ROLE_FILTERS.map((r) => (
            <Pressable
              key={r}
              style={[styles.filterChip, { borderColor: roleFilter === r ? colors.accent : colors.border, backgroundColor: roleFilter === r ? colors.accent + "18" : "transparent" }]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[styles.filterChipText, { color: roleFilter === r ? colors.accent : colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{r}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        scrollEnabled={!!(data?.rows?.length)}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No users found" subtitle="Tap + to create a user" />}
        renderItem={({ item }) => (
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
                </View>
              </View>
              <View style={[styles.statusDot, { backgroundColor: item.status === "ACTIVE" ? colors.success : colors.statusInactive }]} />
            </View>
          </Pressable>
        )}
      />

      <Pressable style={[styles.fab, { backgroundColor: colors.accent }]} onPress={() => setShowCreate(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.overlay}>
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
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Password (min 8 chars) *"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

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
                <ScrollView style={styles.clinicPicker} showsVerticalScrollIndicator={false}>
                  {(clinicsData?.rows ?? []).map((c) => (
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
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => { setShowCreate(false); resetForm(); }}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.accent, borderColor: colors.accent, opacity: createMutation.isPending ? 0.7 : 1 }]}
                onPress={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>Create</Text>
                )}
              </Pressable>
            </View>
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
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 26, marginBottom: 10 },
  searchInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 10 },
  filterRow: { marginBottom: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 13 },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16 },
  cardInfo: { flex: 1, gap: 4 },
  cardEmail: { fontSize: 14 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  roleBadgeText: { fontSize: 11, letterSpacing: 0.3 },
  clinicName: { fontSize: 12, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  fab: { position: "absolute", bottom: 100, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12, maxHeight: "90%" },
  modalTitle: { fontSize: 20, marginBottom: 4 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  roleRow: { flexDirection: "row", gap: 8 },
  roleOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  roleOptionText: { fontSize: 13 },
  clinicPicker: { maxHeight: 140, borderWidth: 1, borderRadius: 10, borderColor: "transparent" },
  clinicOption: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, borderWidth: 1, marginBottom: 6 },
  clinicOptionText: { fontSize: 14 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
