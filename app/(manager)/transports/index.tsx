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
import { T } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { Divider } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";

interface Transport {
  id: string;
  name: string;
  type?: string;
  phone?: string;
  capacity?: number;
}

export default function TransportsScreen() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", phone: "", capacity: "" });
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch, isRefetching } = useQuery<Transport[]>({
    queryKey: ["/v1/manager/transports"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/v1/manager/transports");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const payload = { ...body, capacity: body.capacity ? Number(body.capacity) : undefined };
      const res = await apiRequest("POST", "/v1/manager/transports", payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] });
      setShowCreate(false);
      setForm({ name: "", type: "", phone: "", capacity: "" });
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to create transport"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/transports/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] }),
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to delete transport"),
  });

  return (
    <View style={styles.root}>
      <ManagerHeader
        title="Transports"
        backButton
        onBack={() => router.back()}
        right={
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={20} color={T.primary} />
          </Pressable>
        }
      />

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator color={T.accent} size="large" /></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 40 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ItemSeparatorComponent={() => <Divider inset={64} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>No transports yet. Add your first transport.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Ionicons name="car-outline" size={20} color="#059669" />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.type && <Text style={styles.meta}>{item.type}</Text>}
                {item.capacity && <Text style={styles.meta}>Capacity: {item.capacity}</Text>}
                {item.phone && <Text style={styles.meta}>{item.phone}</Text>}
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => Alert.alert("Delete Transport", `Remove ${item.name}?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                ])}
              >
                <Ionicons name="trash-outline" size={18} color={T.danger} />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Transport</Text>
            <Pressable onPress={() => setShowCreate(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {[
              { key: "name", label: "Name *", placeholder: "Express Shuttle" },
              { key: "type", label: "Type", placeholder: "Van, Bus, Private Car…" },
              { key: "phone", label: "Phone", placeholder: "+1 555 000 0000" },
              { key: "capacity", label: "Capacity", placeholder: "8" },
            ].map(({ key, label, placeholder }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder={placeholder}
                  placeholderTextColor={T.textMuted}
                  value={form[key as keyof typeof form]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  keyboardType={key === "capacity" ? "number-pad" : "default"}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.btnSecondary} onPress={() => setShowCreate(false)}>
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btnPrimary, { opacity: !form.name.trim() || createMutation.isPending ? 0.6 : 1 }]}
              onPress={() => createMutation.mutate(form)}
              disabled={!form.name.trim() || createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryText}>Add Transport</Text>
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
  row: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: T.sp16,
    paddingVertical: T.sp12, backgroundColor: T.surface, gap: T.sp12,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: T.r10, backgroundColor: "#05966918",
    alignItems: "center", justifyContent: "center",
  },
  info: { flex: 1 },
  name: { fontFamily: "Inter_600SemiBold" as any, fontSize: 15, color: T.text },
  meta: { fontFamily: "Inter_400Regular", fontSize: 12, color: T.textMuted },
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
  fieldLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: T.textSec },
  fieldInput: {
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border, borderRadius: T.r10,
    paddingHorizontal: 14, paddingVertical: T.sp12,
    fontFamily: "Inter_400Regular", fontSize: 15, color: T.text,
  },
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
