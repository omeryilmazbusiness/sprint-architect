import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { listClinics, createClinic, Clinic, ClinicListResponse } from "@/lib/api/adminClinics";

export default function ClinicsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCurrency, setNewCurrency] = useState("EUR");
  const [newPrice, setNewPrice] = useState("");

  function handleSearchChange(text: string) {
    setSearch(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => setDebouncedSearch(text), 300);
    setDebounceTimer(t);
  }

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ClinicListResponse>({
    queryKey: ["/v1/admin/clinics", debouncedSearch],
    queryFn: () => listClinics({ search: debouncedSearch || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createClinic,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/clinics"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/metrics"] });
      setShowCreate(false);
      setNewName("");
      setNewCurrency("EUR");
      setNewPrice("");
    },
    onError: (err: any) => Alert.alert("Error", err.message || "Failed to create clinic"),
  });

  function handleCreate() {
    if (!newName.trim()) return Alert.alert("Validation", "Name is required");
    createMutation.mutate({
      name: newName.trim(),
      currency: newCurrency.trim() || "EUR",
      billingUnitPrice: newPrice ? parseFloat(newPrice) : null,
    });
  }

  if (isLoading) return <LoadingView message="Loading clinics..." />;
  if (isError) return <ErrorView onRetry={refetch} />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Clinics</Text>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, fontFamily: "Inter_400Regular" }]}
          placeholder="Search clinics..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={data?.rows ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        scrollEnabled={!!(data?.rows?.length)}
        ListEmptyComponent={<EmptyState icon="business-outline" title="No clinics yet" subtitle="Tap + to create your first clinic" />}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push({ pathname: "/(admin)/clinics/[id]", params: { id: item.id } })}
          >
            <View style={styles.cardTop}>
              <Text style={[styles.cardName, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                {item.name}
              </Text>
              <StatusBadge status={item.status as any} small />
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="card-outline" size={13} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                  {item.currency}
                  {item.billingUnitPrice != null ? ` · €${item.billingUnitPrice}` : " · default rate"}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        testID="create-clinic-fab"
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setShowCreate(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>New Clinic</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Clinic name *"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Currency (e.g. EUR)"
              placeholderTextColor={colors.textMuted}
              value={newCurrency}
              onChangeText={setNewCurrency}
              autoCapitalize="characters"
              maxLength={3}
            />
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background, fontFamily: "Inter_400Regular" }]}
              placeholder="Unit price (optional)"
              placeholderTextColor={colors.textMuted}
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="decimal-pad"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border }]}
                onPress={() => { setShowCreate(false); setNewName(""); setNewCurrency("EUR"); setNewPrice(""); }}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 26, marginBottom: 10 },
  searchInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  list: { padding: 16, gap: 10 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardName: { flex: 1, fontSize: 16 },
  cardMeta: { flexDirection: "row", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  fab: {
    position: "absolute",
    bottom: 110,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  modalTitle: { fontSize: 20, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", borderWidth: 1 },
  modalBtnText: { fontSize: 15 },
});
