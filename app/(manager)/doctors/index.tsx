import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Animated,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { apiRequest } from "@/lib/query-client";
import DoctorListCard from "@/components/managerDoctors/DoctorListCard";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface Doctor {
  id: string;
  fullName: string;
  specialty?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  university?: string;
  graduationYear?: number;
  experienceYears?: number;
  bio?: string;
  languages?: string;
  certifications?: string;
  diplomaUrl?: string;
  createdAt?: string;
}

export default function DoctorsScreen() {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Doctor | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    fullName: "",
    specialty: "",
    phone: "",
    email: "",
    university: "",
    graduationYear: "",
    experienceYears: "",
    languages: "",
    bio: "",
    certifications: "",
  });
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 2000 : 1200);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (showForm) {
      Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [showForm]);

  const { data, isLoading, refetch, isRefetching } = useQuery<{ rows: Doctor[]; total: number }>({
    queryKey: ["/v1/manager/doctors", debouncedSearch],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set("search", debouncedSearch);
      const res = await apiRequest("GET", `/v1/manager/doctors${p.toString() ? `?${p}` : ""}`);
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const method = editingItem ? "PUT" : "POST";
      const path = editingItem ? `/v1/manager/doctors/${editingItem.id}` : "/v1/manager/doctors";
      const res = await apiRequest(method, path, body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error((err as any).message ?? "Failed to save doctor");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"], exact: false });
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      showToast(editingItem ? "Doctor updated" : "Doctor added");
    },
    onError: (e: any) => showToast(e.message ?? "Failed to save doctor", "error"),
  });

  const resetForm = () => {
    setForm({
      fullName: "",
      specialty: "",
      phone: "",
      email: "",
      university: "",
      graduationYear: "",
      experienceYears: "",
      languages: "",
      bio: "",
      certifications: "",
    });
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingItem(doctor);
    setForm({
      fullName: doctor.fullName || "",
      specialty: doctor.specialty || "",
      phone: doctor.phone || "",
      email: doctor.email || "",
      university: doctor.university || "",
      graduationYear: doctor.graduationYear?.toString() || "",
      experienceYears: doctor.experienceYears?.toString() || "",
      languages: doctor.languages || "",
      bio: doctor.bio || "",
      certifications: doctor.certifications || "",
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    resetForm();
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!form.fullName.trim()) return;
    const payload = {
      ...form,
      graduationYear: form.graduationYear ? parseInt(form.graduationYear) : null,
      experienceYears: form.experienceYears ? parseInt(form.experienceYears) : null,
    };
    mutation.mutate(payload);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/doctors/${id}`);
    },
    onSuccess: (_data, id) => {
      setDeletedIds((prev) => new Set(prev).add(id));
      showToast("Doctor removed");
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"], exact: false });
    },
    onError: (e: any) => {
      if (e?.code === "DOC-DEL-001") {
        showToast("Doctor has appointments — cannot delete", "error");
      } else {
        showToast(e.message ?? "Failed to delete doctor", "error");
      }
    },
  });

  return (
    <View style={styles.root}>
      <ManagerHeader
        title="Doctors"
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

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={T.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search doctors..."
          placeholderTextColor={T.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomPad + 40 }}>
          {[1, 2, 3, 4].map((k) => (
            <View key={k} style={styles.skeletonCard}>
              <View style={styles.skeletonRow}>
                <View style={styles.skeletonAvatar} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={[styles.skeletonLine, { width: "65%" }]} />
                  <View style={[styles.skeletonLine, { width: "40%" }]} />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={[styles.skeletonLine, { width: 80, height: 24, borderRadius: 12 }]} />
                <View style={[styles.skeletonLine, { width: 100, height: 24, borderRadius: 12 }]} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={(data?.rows ?? []).filter((d) => !deletedIds.has(d.id))}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: bottomPad + 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListHeaderComponent={
            (data?.total ?? 0) > 0 ? (
              <Text style={styles.listCount}>
                {data!.total} {data!.total === 1 ? "Doctor" : "Doctors"}
                {debouncedSearch ? ` matching "${debouncedSearch}"` : ""}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="medkit-outline" size={40} color={T.border} />
              <Text style={styles.emptyTitle}>
                {debouncedSearch ? "No results found" : "No doctors yet"}
              </Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? "Try a different search" : "Tap + to add your first doctor"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <DoctorListCard
              doctor={item}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        />
      )}

      <Modal visible={showForm} transparent animationType="none" onRequestClose={() => setShowForm(false)} statusBarTranslucent>
        <View style={styles.sheetOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowForm(false)} />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}
          >
          <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? "Edit Doctor" : "Add Doctor"}</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={10} style={styles.sheetCloseBtn}>
                <Ionicons name="close" size={24} color={T.text} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Dr. Jane Smith"
                placeholderTextColor={T.textMuted}
                value={form.fullName}
                onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))}
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Specialty</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Cardiology"
                  placeholderTextColor={T.textMuted}
                  value={form.specialty}
                  onChangeText={(v) => setForm((f) => ({ ...f, specialty: v }))}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="+1..."
                  placeholderTextColor={T.textMuted}
                  value={form.phone}
                  onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="dr.smith@clinic.com"
                placeholderTextColor={T.textMuted}
                value={form.email}
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>University</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Medical School Name"
                placeholderTextColor={T.textMuted}
                value={form.university}
                onChangeText={(v) => setForm((f) => ({ ...f, university: v }))}
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Grad. Year</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="2010"
                  placeholderTextColor={T.textMuted}
                  value={form.graduationYear}
                  onChangeText={(v) => setForm((f) => ({ ...f, graduationYear: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Exp. Years</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="12"
                  placeholderTextColor={T.textMuted}
                  value={form.experienceYears}
                  onChangeText={(v) => setForm((f) => ({ ...f, experienceYears: v }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Languages</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="English, Turkish..."
                placeholderTextColor={T.textMuted}
                value={form.languages}
                onChangeText={(v) => setForm((f) => ({ ...f, languages: v }))}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Bio</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                placeholder="Doctor's background..."
                placeholderTextColor={T.textMuted}
                value={form.bio}
                onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Certifications</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                placeholder="List certifications..."
                placeholderTextColor={T.textMuted}
                value={form.certifications}
                onChangeText={(v) => setForm((f) => ({ ...f, certifications: v }))}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.btnSecondary} onPress={() => setShowForm(false)}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, { opacity: !form.fullName.trim() || mutation.isPending ? 0.6 : 1 }]}
              onPress={handleSubmit}
              disabled={!form.fullName.trim() || mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryText}>{editingItem ? "Save Changes" : "Add Doctor"}</Text>
              }
            </Pressable>
          </View>
          </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={!!toast}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.toastOverlay} pointerEvents="none" testID="doctors-screen-toast">
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
            <Text style={styles.toastText}>{toast?.msg}</Text>
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: T.sp16,
    marginTop: T.sp12,
    marginBottom: T.sp8,
    backgroundColor: T.surface,
    borderRadius: T.r10,
    paddingHorizontal: T.sp12,
    borderWidth: 1,
    borderColor: T.border,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
    height: 42,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 16,
  },
  info: { flex: 1 },
  name: { fontFamily: "Inter_600SemiBold" as any, fontSize: 15, color: T.text },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textMuted, marginTop: 2 },
  listCount: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 13,
    color: T.textMuted,
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp8,
    paddingTop: 4,
  },
  empty: { paddingTop: 80, alignItems: "center", gap: T.sp8, paddingHorizontal: T.sp32 },
  emptyTitle: { fontFamily: "Inter_600SemiBold" as any, fontSize: 16, color: T.text, textAlign: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center" },
  skeletonCard: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: T.sp16,
    marginBottom: T.sp12,
    padding: T.sp16,
    gap: 12,
  },
  skeletonRow: { flexDirection: "row", alignItems: "center", gap: T.sp12 },
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.border, flexShrink: 0 },
  skeletonLine: { height: 13, backgroundColor: T.border, borderRadius: 6 },
  modal: { flex: 1, backgroundColor: T.bg },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: T.sp20, paddingTop: T.sp24, paddingBottom: T.sp16,
    backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  modalContent: { padding: T.sp20, gap: T.sp16, paddingBottom: 40 },
  field: { gap: T.sp4 },
  fieldRow: { flexDirection: "row", gap: T.sp12 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  fieldInput: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: T.r10,
    paddingHorizontal: 14, paddingVertical: T.sp12,
    fontFamily: "Inter_400Regular", fontSize: 15, color: T.text,
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
  btnSecondaryText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  btnPrimary: {
    flex: 2, height: 46, borderRadius: T.r10, backgroundColor: T.primary,
    alignItems: "center", justifyContent: "center",
  },
  btnPrimaryText: { fontFamily: "Inter_600SemiBold" as any, fontSize: 15, color: "#fff" },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: T.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    overflow: "hidden",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  sheetCloseBtn: { padding: 4 },
  toastOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "web" ? 54 : 34,
  },
  toastBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  toastBarSuccess: { backgroundColor: T.success },
  toastBarError: { backgroundColor: T.danger },
  toastText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#fff",
  },
});
