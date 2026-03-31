import React, { useEffect, useRef, useState } from "react";
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
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { apiRequest } from "@/lib/query-client";

const SCREEN_H = Dimensions.get("window").height;
const QK = ["/v1/manager/document-types"] as const;

interface DocumentTypeItem {
  id: string;
  name: string;
  note: string | null;
  createdAt: string;
}

interface ListResponse {
  items: DocumentTypeItem[];
  totalCount: number;
}

export default function DocumentTypesScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentTypeItem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<ListResponse>({
    queryKey: QK,
  });

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; note?: string }) => {
      const res = await apiRequest("POST", "/v1/manager/document-types", body);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.code === "DOC-TYPE-001") throw new Error("This document type already exists.");
        throw new Error(j?.message ?? "Failed to create document type");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      setShowForm(false);
      setFormError(null);
      showToast("Document type created", "success");
    },
    onError: (e: any) => {
      setFormError(e.message ?? "Something went wrong");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { name: string; note?: string } }) => {
      const res = await apiRequest("PUT", `/v1/manager/document-types/${id}`, body);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.code === "DOC-TYPE-001") throw new Error("This document type already exists.");
        throw new Error(j?.message ?? "Failed to update document type");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      setEditingItem(null);
      setFormError(null);
      showToast("Document type updated", "success");
    },
    onError: (e: any) => {
      setFormError(e.message ?? "Something went wrong");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/v1/manager/document-types/${id}`);
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      showToast("Document type removed", "success");
    },
    onError: () => showToast("Failed to delete document type", "error"),
  });

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === "error" ? 2200 : 1400);
  };

  const handleEdit = (item: DocumentTypeItem) => {
    setFormError(null);
    setEditingItem(item);
  };

  const filteredItems = (data?.items ?? []).filter((item) => {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.note?.toLowerCase().includes(q) ?? false)
    );
  });

  const handleDelete = (item: DocumentTypeItem) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Remove "${item.name}"?`)) deleteMutation.mutate(item.id);
    } else {
      Alert.alert("Remove Document Type", `Remove "${item.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
      ]);
    }
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={styles.root}>
      <ManagerHeader
        title="Document Types"
        backButton
        onBack={() => router.back()}
        right={
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => { setFormError(null); setShowForm(true); }}
            testID="btn-add-document-type"
          >
            <Ionicons name="add" size={22} color={T.primary} />
          </Pressable>
        }
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={T.textMuted} />
          <Text style={styles.errorText}>Could not load document types</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList<DocumentTypeItem>
          data={filteredItems}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad + 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          ListHeaderComponent={
            (data?.items?.length ?? 0) > 0 ? (
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={16} color={T.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search document types…"
                  placeholderTextColor={T.textMuted}
                  value={searchText}
                  onChangeText={setSearchText}
                  clearButtonMode="while-editing"
                  returnKeyType="search"
                />
                {searchText.length > 0 && (
                  <Pressable onPress={() => setSearchText("")} hitSlop={10}>
                    <Ionicons name="close-circle" size={16} color={T.textMuted} />
                  </Pressable>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            searchText.trim() ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={32} color={T.textMuted} />
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptySubtitle}>No document types match "{searchText}"</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="document-attach-outline" size={32} color={T.accent} />
                </View>
                <Text style={styles.emptyTitle}>No document types yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create document types for your clinic. They will be used to track guest documentation.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.emptyBtn, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => { setFormError(null); setShowForm(true); }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyBtnText}>Add Document Type</Text>
                </Pressable>
              </View>
            )
          }
          renderItem={({ item }) => (
            <DocumentTypeCard
              item={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <DocumentTypeFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(d) => createMutation.mutate(d)}
        isLoading={createMutation.isPending}
        errorMessage={formError}
      />

      <DocumentTypeFormSheet
        visible={editingItem !== null}
        editingItem={editingItem}
        onClose={() => { setEditingItem(null); setFormError(null); }}
        onSubmit={(d) => {
          if (editingItem) updateMutation.mutate({ id: editingItem.id, body: d });
        }}
        isLoading={updateMutation.isPending}
        errorMessage={formError}
      />

      {toast && <Toast message={toast.msg} type={toast.type} />}
    </View>
  );
}

function DocumentTypeCard({
  item,
  onEdit,
  onDelete,
}: {
  item: DocumentTypeItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const created = new Date(item.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.cardLeft}>
        <View style={styles.cardIcon}>
          <Ionicons name="document-text-outline" size={18} color={T.accent} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          {item.note ? (
            <Text style={styles.cardNote} numberOfLines={2}>{item.note}</Text>
          ) : (
            <Text style={styles.cardNotePlaceholder}>No description</Text>
          )}
          <Text style={styles.cardDate}>Added {created}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable onPress={onEdit} hitSlop={10} style={styles.editBtn} testID={`edit-doc-type-${item.id}`}>
          <Ionicons name="pencil-outline" size={16} color={T.accent} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn} testID={`delete-doc-type-${item.id}`}>
          <Ionicons name="trash-outline" size={16} color={T.danger} />
        </Pressable>
      </View>
    </View>
  );
}

interface FormSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; note?: string }) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  editingItem?: DocumentTypeItem | null;
}

function DocumentTypeFormSheet({ visible, onClose, onSubmit, isLoading, errorMessage, editingItem }: FormSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [nameError, setNameError] = useState("");
  const isEditing = !!editingItem;

  useEffect(() => {
    if (visible) {
      setName(editingItem?.name ?? "");
      setNote(editingItem?.note ?? "");
      setNameError("");
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) { setNameError("Name must be at least 2 characters"); return; }
    if (trimmed.length > 60) { setNameError("Name must be at most 60 characters"); return; }
    setNameError("");
    onSubmit({ name: trimmed, note: note.trim() || undefined });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{isEditing ? "Edit Document Type" : "Add Document Type"}</Text>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={T.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {!!errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning-outline" size={16} color={T.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}
              <View style={styles.field}>
                <Text style={[styles.label, !!nameError && { color: T.danger }]}>
                  Name {nameError ? `— ${nameError}` : ""}
                  {!nameError && <Text style={styles.required}> *</Text>}
                </Text>
                <TextInput
                  style={[styles.input, !!nameError && styles.inputError]}
                  placeholder="e.g. Passport Copy, Medical Report"
                  placeholderTextColor={T.textMuted}
                  value={name}
                  onChangeText={(v) => { setName(v); if (nameError) setNameError(""); }}
                  returnKeyType="next"
                  testID="input-doc-type-name"
                  maxLength={60}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>
                  Description <Text style={styles.optional}>(optional)</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description of what this document is for"
                  placeholderTextColor={T.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                  testID="input-doc-type-note"
                  maxLength={240}
                />
                <Text style={styles.charCount}>{note.length}/240</Text>
              </View>
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable style={({ pressed }) => [styles.btnSecondary, { opacity: pressed ? 0.7 : 1 }]} onPress={onClose}>
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, { opacity: pressed || isLoading ? 0.75 : 1 }]}
                onPress={handleSubmit}
                disabled={isLoading}
                testID="btn-save-doc-type"
              >
                {isLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>{isEditing ? "Update" : "Save"}</Text>}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? 67 : insets.top + 8;
  return (
    <View
      style={[styles.toast, type === "error" ? styles.toastError : styles.toastSuccess, { top }]}
      pointerEvents="none"
    >
      <Ionicons
        name={type === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={16} color="#fff" style={{ marginRight: 6 }}
      />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.textMuted, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: T.accent },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  addBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  searchRow: { flexDirection: "row", alignItems: "center", backgroundColor: T.surface, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, marginTop: 16, gap: 8 },
  searchIcon: { flexShrink: 0 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, color: T.text, padding: 0 },
  card: { backgroundColor: T.surface, borderRadius: 14, borderWidth: 1, borderColor: "#E8ECF0", marginBottom: 12, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardLeft: { flex: 1, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  cardIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontFamily: "Inter_700Bold", fontSize: 16, color: T.text, letterSpacing: -0.2 },
  cardNote: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec, lineHeight: 18, marginTop: 2 },
  cardNotePlaceholder: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textMuted, fontStyle: "italic", marginTop: 2 },
  cardDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted, marginTop: 6 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  empty: { paddingTop: 80, alignItems: "center", gap: 12, paddingHorizontal: 32 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 18, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text, textAlign: "center" },
  emptySubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: T.textMuted, textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: T.accent, marginTop: 8 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F0F2F5" },
  sheetTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F4F6F9", alignItems: "center", justifyContent: "center" },
  sheetBody: { padding: 20, gap: 20 },
  field: { gap: 6 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.textSec },
  required: { color: T.danger },
  optional: { fontFamily: "Inter_400Regular", color: T.textMuted },
  input: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: T.text },
  inputError: { borderColor: T.danger },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 11, color: T.textMuted, textAlign: "right", marginTop: 2 },
  errorBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA", borderRadius: 10, padding: 12 },
  errorBannerText: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.danger, flex: 1 },
  sheetActions: { flexDirection: "row", paddingHorizontal: 20, paddingTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: "#F0F2F5" },
  btnSecondary: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center", backgroundColor: T.surface },
  btnSecondaryText: { fontFamily: "Inter_500Medium", fontSize: 15, color: T.text },
  btnPrimary: { flex: 2, height: 48, borderRadius: 12, backgroundColor: T.accent, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  toast: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, zIndex: 999 },
  toastSuccess: { backgroundColor: T.success },
  toastError: { backgroundColor: T.danger },
  toastText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff", flex: 1 },
});
