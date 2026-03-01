import React, { useState } from "react";
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
}

export default function DoctorsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Doctor | null>(null);
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

  const { data, isLoading, refetch, isRefetching } = useQuery<{ rows: Doctor[] }>({
    queryKey: ["/v1/manager/doctors"],
  });

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const method = editingItem ? "PUT" : "POST";
      const path = editingItem ? `/v1/manager/doctors/${editingItem.id}` : "/v1/manager/doctors";
      const res = await apiRequest(method, path, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"] });
      setShowForm(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to save doctor"),
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
    const payload = {
      ...form,
      graduationYear: form.graduationYear ? parseInt(form.graduationYear) : undefined,
      experienceYears: form.experienceYears ? parseInt(form.experienceYears) : undefined,
    };
    mutation.mutate(payload);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/doctors/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"] }),
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to delete doctor"),
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

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={T.accent} size="large" /></View>
      ) : (
        <FlatList
          data={data?.rows ?? []}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 40, paddingHorizontal: T.sp16, paddingTop: T.sp16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="medkit-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>No doctors yet. Add your first doctor.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => handleEdit(item)} style={[styles.card, cardShadow]}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.fullName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  {item.specialty && <Text style={styles.meta}>{item.specialty}</Text>}
                  {item.phone && <Text style={styles.meta}>{item.phone}</Text>}
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => Alert.alert("Delete Doctor", `Remove ${item.fullName}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                  ])}
                >
                  <Ionicons name="trash-outline" size={18} color={T.danger} />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? "Edit Doctor" : "Add Doctor"}</Text>
            <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  addBtn: { padding: 6 },
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
  empty: { paddingTop: 80, alignItems: "center", gap: T.sp12, paddingHorizontal: T.sp32 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center" },
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
});
