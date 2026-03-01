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

import { Switch } from "react-native";

interface DocumentType {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
}

export default function DocumentTypesScreen() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentType | null>(null);
  const [form, setForm] = useState({ name: "", description: "", isRequired: false });
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch, isRefetching } = useQuery<{ rows: DocumentType[] }>({
    queryKey: ["/v1/manager/document-types"],
  });

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const method = editingItem ? "PUT" : "POST";
      const path = editingItem ? `/v1/manager/document-types/${editingItem.id}` : "/v1/manager/document-types";
      const res = await apiRequest(method, path, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/document-types"] });
      setShowForm(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to save document type"),
  });

  const resetForm = () => {
    setForm({ name: "", description: "", isRequired: false });
  };

  const handleEdit = (item: DocumentType) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      description: item.description || "",
      isRequired: !!item.isRequired,
    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    resetForm();
    setShowForm(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/document-types/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/v1/manager/document-types"] }),
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to delete document type"),
  });

  return (
    <View style={styles.root}>
      <ManagerHeader
        title="Document Types"
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
              <Ionicons name="document-attach-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>No document types yet. Add your first type.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => handleEdit(item)} style={[styles.card, cardShadow]}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="document-attach-outline" size={20} color={T.warning} />
                </View>
                <View style={styles.info}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.isRequired && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  {item.description && <Text style={styles.meta} numberOfLines={2}>{item.description}</Text>}
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => Alert.alert("Delete Type", `Remove "${item.name}"?`, [
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
            <Text style={styles.modalTitle}>{editingItem ? "Edit Document Type" : "Add Document Type"}</Text>
            <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Medical History Report"
                placeholderTextColor={T.textMuted}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                placeholder="Describe what this document is for…"
                placeholderTextColor={T.textMuted}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={[styles.field, styles.toggleField]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Required</Text>
                <Text style={styles.fieldHint}>Patients must upload this document</Text>
              </View>
              <Switch
                value={form.isRequired}
                onValueChange={(v) => setForm((f) => ({ ...f, isRequired: v }))}
                trackColor={{ false: T.border, true: T.primary }}
              />
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.btnSecondary} onPress={() => setShowForm(false)}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, { opacity: !form.name.trim() || mutation.isPending ? 0.6 : 1 }]}
              onPress={() => mutation.mutate(form)}
              disabled={!form.name.trim() || mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryText}>{editingItem ? "Save Changes" : "Create Type"}</Text>
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
    flexDirection: "row", alignItems: "center", gap: T.sp12,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: T.r10, backgroundColor: "#D9770618",
    alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontFamily: "Inter_600SemiBold" as any, fontSize: 15, color: T.text },
  requiredBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: T.dangerBg, borderWidth: 0.5, borderColor: T.dangerBorder,
  },
  requiredText: { fontSize: 10, color: T.danger, fontFamily: "Inter_600SemiBold" as any },
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
  modalContent: { padding: T.sp20, gap: T.sp20, paddingBottom: 40 },
  field: { gap: T.sp4 },
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  fieldHint: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted },
  fieldInput: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: T.r10,
    paddingHorizontal: 14, paddingVertical: T.sp12,
    fontFamily: "Inter_400Regular", fontSize: 15, color: T.text,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  toggleField: { flexDirection: "row", alignItems: "center", gap: T.sp12 },
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
