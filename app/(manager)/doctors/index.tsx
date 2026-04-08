import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { apiRequest } from "@/lib/query-client";
import DoctorListCard, { Doctor } from "@/components/managerDoctors/DoctorListCard";
import { useT } from "@/hooks/useT";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface DoctorForm {
  fullName: string;
  specialty: string;
  phone: string;
  email: string;
  university: string;
  graduationYear: string;
  experienceYears: string;
  languages: string;
  bio: string;
  certifications: string;
}

const EMPTY_FORM: DoctorForm = {
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
};

function SectionLabel({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={sectionStyles.row}>
      <View style={sectionStyles.iconWrap}>
        <Ionicons name={icon} size={14} color={T.accent} />
      </View>
      <Text style={sectionStyles.label}>{title}</Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: T.accent + "14",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 12,
    color: T.accent,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
});

export default function DoctorsScreen() {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const t = useT();
  const td = t.managerDoctors;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Doctor | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<DoctorForm>(EMPTY_FORM);
  const [nameError, setNameError] = useState(false);
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 2000 : 1200);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
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
    mutationFn: async (body: Record<string, unknown>) => {
      const method = editingItem ? "PUT" : "POST";
      const path = editingItem ? `/v1/manager/doctors/${editingItem.id}` : "/v1/manager/doctors";
      const res = await apiRequest(method, path, body);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error((err as { message?: string }).message ?? td.toastFailedSave);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"], exact: false });
      setShowForm(false);
      setEditingItem(null);
      setForm(EMPTY_FORM);
      showToast(editingItem ? td.toastDoctorUpdated : td.toastDoctorAdded);
    },
    onError: (e: Error) => showToast(e.message ?? td.toastFailedSave, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/doctors/${id}`);
    },
    onSuccess: (_data, id) => {
      setDeletedIds((prev) => new Set(prev).add(id));
      showToast(td.toastDoctorRemoved);
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"], exact: false });
    },
    onError: (e: Error & { code?: string }) => {
      if (e?.code === "DOC-DEL-001") {
        showToast(td.toastHasAppointments, "error");
      } else {
        showToast(e.message ?? td.toastFailedDelete, "error");
      }
    },
  });

  const handleEdit = (doctor: Doctor) => {
    setEditingItem(doctor);
    setNameError(false);
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
    setNameError(false);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setNameError(false);
  };

  const handleSubmit = () => {
    if (!form.fullName.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    const payload: Record<string, unknown> = {
      ...form,
      graduationYear: form.graduationYear ? parseInt(form.graduationYear) : null,
      experienceYears: form.experienceYears ? parseInt(form.experienceYears) : null,
    };
    mutation.mutate(payload);
  };

  return (
    <View style={styles.root}>
      <ManagerHeader
        title={td.title}
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
          placeholder={td.searchPlaceholder}
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
                {data!.total} {data!.total === 1 ? td.countSingular : td.countPlural}
                {debouncedSearch ? ` ${td.countMatching.replace("{q}", debouncedSearch)}` : ""}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="medkit-outline" size={40} color={T.border} />
              <Text style={styles.emptyTitle}>
                {debouncedSearch ? td.emptyTitleSearch : td.emptyTitle}
              </Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? td.emptyTextSearch : td.emptyText}
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

      <Modal
        visible={showForm}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
            <Animated.View
              style={[
                styles.sheetContainer,
                { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 16 },
              ]}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>
                    {editingItem ? td.formTitleEdit : td.formTitleAdd}
                  </Text>
                  <Text style={styles.sheetSubtitle}>
                    {editingItem ? td.formSubEdit : td.formSubAdd}
                  </Text>
                </View>
                <Pressable onPress={handleClose} hitSlop={12} style={styles.sheetCloseBtn}>
                  <View style={styles.sheetCloseWrap}>
                    <Ionicons name="close" size={18} color={T.textSec} />
                  </View>
                </Pressable>
              </View>

              <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={styles.sheetBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.section}>
                  <SectionLabel icon="person-outline" title={td.sectionIdentity} />
                  <View style={styles.sectionContent}>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>
                        {td.fieldFullName} <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={[
                          styles.fieldInput,
                          nameError && styles.fieldInputError,
                        ]}
                        placeholder={td.fieldFullNamePlaceholder}
                        placeholderTextColor={T.textMuted}
                        value={form.fullName}
                        onChangeText={(v) => {
                          setForm((f) => ({ ...f, fullName: v }));
                          if (v.trim()) setNameError(false);
                        }}
                        returnKeyType="next"
                      />
                      {nameError && (
                        <Text style={styles.errorText}>{td.fieldFullNameRequired}</Text>
                      )}
                    </View>

                    <View style={styles.fieldRow}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>{td.fieldSpecialty}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder={td.fieldSpecialtyPlaceholder}
                          placeholderTextColor={T.textMuted}
                          value={form.specialty}
                          onChangeText={(v) => setForm((f) => ({ ...f, specialty: v }))}
                          returnKeyType="next"
                        />
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>{td.fieldLanguages}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder={td.fieldLanguagesPlaceholder}
                          placeholderTextColor={T.textMuted}
                          value={form.languages}
                          onChangeText={(v) => setForm((f) => ({ ...f, languages: v }))}
                          returnKeyType="next"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <SectionLabel icon="call-outline" title={td.sectionContact} />
                  <View style={styles.sectionContent}>
                    <View style={styles.fieldRow}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>{td.fieldPhone}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="+1..."
                          placeholderTextColor={T.textMuted}
                          value={form.phone}
                          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                          keyboardType="phone-pad"
                          returnKeyType="next"
                        />
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>{td.fieldEmail}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="dr@clinic.com"
                          placeholderTextColor={T.textMuted}
                          value={form.email}
                          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          returnKeyType="next"
                        />
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.section}>
                  <SectionLabel icon="school-outline" title={td.sectionEducation} />
                  <View style={styles.sectionContent}>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>{td.fieldUniversity}</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder={td.fieldUniversityPlaceholder}
                        placeholderTextColor={T.textMuted}
                        value={form.university}
                        onChangeText={(v) => setForm((f) => ({ ...f, university: v }))}
                        returnKeyType="next"
                      />
                    </View>
                    <View style={styles.fieldRow}>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>{td.fieldGradYear}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="2010"
                          placeholderTextColor={T.textMuted}
                          value={form.graduationYear}
                          onChangeText={(v) => setForm((f) => ({ ...f, graduationYear: v }))}
                          keyboardType="numeric"
                          returnKeyType="next"
                        />
                      </View>
                      <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.fieldLabel}>{td.fieldExpYears}</Text>
                        <TextInput
                          style={styles.fieldInput}
                          placeholder="12"
                          placeholderTextColor={T.textMuted}
                          value={form.experienceYears}
                          onChangeText={(v) => setForm((f) => ({ ...f, experienceYears: v }))}
                          keyboardType="numeric"
                          returnKeyType="next"
                        />
                      </View>
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>{td.fieldCertifications}</Text>
                      <TextInput
                        style={[styles.fieldInput, styles.textArea]}
                        placeholder={td.fieldCertificationsPlaceholder}
                        placeholderTextColor={T.textMuted}
                        value={form.certifications}
                        onChangeText={(v) => setForm((f) => ({ ...f, certifications: v }))}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>
                </View>

                <View style={[styles.section, { marginBottom: 0 }]}>
                  <SectionLabel icon="document-text-outline" title={td.sectionBio} />
                  <View style={styles.sectionContent}>
                    <View style={styles.field}>
                      <TextInput
                        style={[styles.fieldInput, styles.textAreaTall]}
                        placeholder={td.fieldBioPlaceholder}
                        placeholderTextColor={T.textMuted}
                        value={form.bio}
                        onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.sheetActions}>
                <Pressable
                  style={({ pressed }) => [styles.btnCancel, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={handleClose}
                >
                  <Text style={styles.btnCancelText}>{td.btnCancel}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.btnSave,
                    { opacity: !form.fullName.trim() || mutation.isPending || pressed ? 0.72 : 1 },
                  ]}
                  onPress={handleSubmit}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons
                        name={editingItem ? "checkmark-circle-outline" : "add-circle-outline"}
                        size={18}
                        color="#fff"
                      />
                      <Text style={styles.btnSaveText}>
                        {editingItem ? td.btnSaveChanges : td.btnAddDoctor}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!toast} transparent animationType="none" statusBarTranslucent onRequestClose={() => {}}>
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
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.text,
    height: 42,
  },

  listCount: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 13,
    color: T.textMuted,
    paddingHorizontal: T.sp16,
    paddingBottom: T.sp8,
    paddingTop: 4,
  },
  empty: { paddingTop: 80, alignItems: "center", gap: T.sp8, paddingHorizontal: T.sp32 },
  emptyTitle: { fontFamily: "PlusJakartaSans_600SemiBold" as any, fontSize: 16, color: T.text, textAlign: "center" },
  emptyText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center" },

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
  skeletonAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: T.border },
  skeletonLine: { height: 13, backgroundColor: T.border, borderRadius: 6 },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    overflow: "hidden",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: T.sp20,
    paddingVertical: T.sp12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: T.text },
  sheetSubtitle: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.textMuted, marginTop: 2 },
  sheetCloseBtn: { padding: 4 },
  sheetCloseWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { padding: T.sp16, gap: T.sp8, paddingBottom: 8 },

  section: {
    marginBottom: T.sp16,
  },
  sectionContent: {
    gap: T.sp12,
  },
  field: { gap: T.sp4 },
  fieldRow: { flexDirection: "row", gap: T.sp12 },
  fieldLabel: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 12, color: T.textMuted, letterSpacing: 0.3 },
  required: { color: T.danger },
  fieldInput: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r10,
    paddingHorizontal: 14,
    paddingVertical: T.sp12,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
  },
  fieldInputError: { borderColor: T.danger },
  errorText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 12, color: T.danger },
  textArea: { height: 72, textAlignVertical: "top" },
  textAreaTall: { height: 96, textAlignVertical: "top" },

  sheetActions: {
    flexDirection: "row",
    paddingHorizontal: T.sp16,
    paddingTop: T.sp12,
    paddingBottom: 4,
    gap: T.sp12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  btnCancel: {
    flex: 1,
    height: 46,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
  btnCancelText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 15, color: T.text },
  btnSave: {
    flex: 2,
    height: 46,
    borderRadius: T.r10,
    backgroundColor: T.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnSaveText: { fontFamily: "PlusJakartaSans_600SemiBold" as any, fontSize: 15, color: "#fff" },

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
