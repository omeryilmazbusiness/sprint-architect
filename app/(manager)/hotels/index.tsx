import React, { useState, useMemo } from "react";
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
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { Divider } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";
import { useT } from "@/hooks/useT";

interface Hotel {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  stars?: number;
  website?: string;
  createdAt?: string;
}

export default function HotelsScreen() {
  const t = useT();
  const th = t.managerHotels;

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Hotel | null>(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    notes: "",
    stars: "",
    website: "",
  });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 2400 : 1600);
  }

  const { data, isLoading, refetch, isRefetching } = useQuery<{ rows: Hotel[] }>({
    queryKey: ["/v1/manager/hotels"],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data?.rows ?? [];
    return (data?.rows ?? []).filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q) ||
        h.phone?.toLowerCase().includes(q)
    );
  }, [data?.rows, search]);

  const mutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const method = editingItem ? "PUT" : "POST";
      const path = editingItem ? `/v1/manager/hotels/${editingItem.id}` : "/v1/manager/hotels";
      const res = await apiRequest(method, path, body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: th.toastError }));
        throw new Error((err as { message?: string }).message ?? th.toastError);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/hotels"] });
      showToast(editingItem ? th.toastUpdated : th.toastAdded);
      setShowForm(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (e: Error) => showToast(e.message ?? th.toastError, "error"),
  });

  const resetForm = () => {
    setForm({ name: "", address: "", phone: "", email: "", notes: "", stars: "", website: "" });
  };

  const handleEdit = (hotel: Hotel) => {
    setEditingItem(hotel);
    setForm({
      name: hotel.name || "",
      address: hotel.address || "",
      phone: hotel.phone || "",
      email: hotel.email || "",
      notes: hotel.notes || "",
      stars: hotel.stars?.toString() || "",
      website: hotel.website || "",
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const starsVal = form.stars ? parseInt(form.stars, 10) : undefined;
    const payload: Record<string, unknown> = { name: form.name.trim() };
    if (form.address.trim()) payload.address = form.address.trim();
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.website.trim()) payload.website = form.website.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (starsVal !== undefined && !isNaN(starsVal)) payload.stars = starsVal;
    mutation.mutate(payload);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/hotels/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/hotels"] });
      showToast(th.toastRemoved);
    },
    onError: (e: Error) => showToast(e.message ?? th.toastError, "error"),
  });

  const handleDelete = (item: Hotel) => {
    Alert.alert(
      th.deleteTitle,
      th.deleteMsg.replace("{name}", item.name),
      [
        { text: th.btnCancel, style: "cancel" },
        {
          text: th.deleteConfirm,
          style: "destructive",
          onPress: () => deleteMutation.mutate(item.id),
        },
      ]
    );
  };

  const isEmpty = filtered.length === 0;
  const isSearching = search.trim().length > 0;

  return (
    <View style={styles.root}>
      <ManagerHeader
        title={th.title}
        backButton
        onBack={() => router.back()}
        right={
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleCreate}
          >
            <Ionicons name="add" size={20} color={T.primary} />
          </Pressable>
        }
      />

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={th.searchPlaceholder}
          placeholderTextColor={T.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== "ios" && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={T.textMuted} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={T.accent} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 40, paddingHorizontal: T.sp16, paddingTop: T.sp12 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bed-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>
                {isSearching ? th.emptySearchText : th.emptyText}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => handleEdit(item)} style={[styles.card, cardShadow]}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="bed-outline" size={20} color={T.accent} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.stars ? <Text style={styles.stars}>{"★".repeat(item.stars)}</Text> : null}
                  {item.address && <Text style={styles.meta}>{item.address}</Text>}
                  {item.phone && <Text style={styles.meta}>{item.phone}</Text>}
                </View>
                <Pressable hitSlop={8} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color={T.danger} />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      {/* Toast */}
      {toast && (
        <View style={[styles.toast, toast.type === "error" ? styles.toastError : styles.toastSuccess]}>
          <Ionicons
            name={toast.type === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
            size={16}
            color="#fff"
          />
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

      {/* Form modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? th.formTitleEdit : th.formTitleAdd}</Text>
            <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{th.fieldHotelName}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={th.fieldHotelNamePlaceholder}
                placeholderTextColor={T.textMuted}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{th.fieldAddress}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder={th.fieldAddressPlaceholder}
                placeholderTextColor={T.textMuted}
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>{th.fieldPhone}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="+1..."
                  placeholderTextColor={T.textMuted}
                  value={form.phone}
                  onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>{th.fieldStars}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="5"
                  placeholderTextColor={T.textMuted}
                  value={form.stars}
                  onChangeText={(v) => setForm((f) => ({ ...f, stars: v }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{th.fieldEmail}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="info@hotel.com"
                placeholderTextColor={T.textMuted}
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{th.fieldWebsite}</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="https://..."
                placeholderTextColor={T.textMuted}
                value={form.website}
                onChangeText={(v) => setForm((f) => ({ ...f, website: v }))}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{th.fieldNotes}</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                placeholder={th.fieldNotesPlaceholder}
                placeholderTextColor={T.textMuted}
                value={form.notes}
                onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.btnSecondary} onPress={() => setShowForm(false)}>
              <Text style={styles.btnSecondaryText}>{th.btnCancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, { opacity: !form.name.trim() || mutation.isPending ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={!form.name.trim() || mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryText}>{editingItem ? th.btnSaveChanges : th.btnAddHotel}</Text>
              }
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
  addBtn: { padding: 6 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: T.sp16,
    marginTop: T.sp12,
    marginBottom: T.sp4,
    backgroundColor: T.surface,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.text,
    padding: 0,
  },

  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: T.sp12 },
  iconWrap: {
    width: 38, height: 38, borderRadius: T.r10, backgroundColor: "#0369A118",
    alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontFamily: "PlusJakartaSans_600SemiBold" as "PlusJakartaSans_600SemiBold", fontSize: 15, color: T.text },
  stars: { fontSize: 12, color: "#D97706", marginTop: 2 },
  meta: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.textMuted, marginTop: 2 },
  empty: { paddingTop: 80, alignItems: "center", gap: T.sp12, paddingHorizontal: T.sp32 },
  emptyText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center" },

  // Toast
  toast: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 50 : 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    maxWidth: 320,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10 },
      android: { elevation: 8 },
      default: {},
    }),
  },
  toastSuccess: { backgroundColor: "#16A34A" },
  toastError: { backgroundColor: "#DC2626" },
  toastText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13.5, color: "#fff", flexShrink: 1 },

  // Modal
  modal: { flex: 1, backgroundColor: T.bg },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: T.sp20, paddingTop: T.sp24, paddingBottom: T.sp16,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: T.text },
  modalContent: { padding: T.sp20, gap: T.sp16, paddingBottom: 40 },
  field: { gap: T.sp4 },
  fieldRow: { flexDirection: "row", gap: T.sp12 },
  fieldLabel: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, color: T.textSec },
  fieldInput: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: T.r10,
    paddingHorizontal: 14, paddingVertical: T.sp12,
    fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.text,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  modalActions: {
    flexDirection: "row", padding: T.sp20, gap: T.sp12,
    borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface,
    ...(Platform.OS === "web" ? { paddingBottom: 34 } : {}),
  },
  btnSecondary: {
    flex: 1, height: 46, borderRadius: T.r10, borderWidth: 1, borderColor: T.border,
    alignItems: "center", justifyContent: "center", backgroundColor: T.surface,
  },
  btnSecondaryText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 15, color: T.text },
  btnPrimary: {
    flex: 2, height: 46, borderRadius: T.r10, backgroundColor: T.primary,
    alignItems: "center", justifyContent: "center",
  },
  btnPrimaryText: { fontFamily: "PlusJakartaSans_600SemiBold" as "PlusJakartaSans_600SemiBold", fontSize: 15, color: "#fff" },
});
