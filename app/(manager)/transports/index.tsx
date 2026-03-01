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

interface Transport {
  id: string;
  driverName?: string;
  driverPhone: string;
  vehicleInfo?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleBrand?: string;
  meetingPointText?: string;
}

export default function TransportsScreen() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Transport | null>(null);
  const [form, setForm] = useState({
    driverName: "",
    driverPhone: "",
    vehicleInfo: "",
    vehiclePlate: "",
    vehicleModel: "",
    vehicleBrand: "",
    meetingPointText: "",
  });
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, refetch, isRefetching } = useQuery<{ rows: Transport[] }>({
    queryKey: ["/v1/manager/transports"],
  });

  const mutation = useMutation({
    mutationFn: async (body: any) => {
      const method = editingItem ? "PUT" : "POST";
      const path = editingItem ? `/v1/manager/transports/${editingItem.id}` : "/v1/manager/transports";
      const res = await apiRequest(method, path, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] });
      setShowForm(false);
      setEditingItem(null);
      resetForm();
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to save transport"),
  });

  const resetForm = () => {
    setForm({
      driverName: "",
      driverPhone: "",
      vehicleInfo: "",
      vehiclePlate: "",
      vehicleModel: "",
      vehicleBrand: "",
      meetingPointText: "",
    });
  };

  const handleEdit = (transport: Transport) => {
    setEditingItem(transport);
    setForm({
      driverName: transport.driverName || "",
      driverPhone: transport.driverPhone || "",
      vehicleInfo: transport.vehicleInfo || "",
      vehiclePlate: transport.vehiclePlate || "",
      vehicleModel: transport.vehicleModel || "",
      vehicleBrand: transport.vehicleBrand || "",
      meetingPointText: transport.meetingPointText || "",
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
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingBottom: bottomPad + 40, paddingHorizontal: T.sp16, paddingTop: T.sp16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-outline" size={36} color={T.textMuted} />
              <Text style={styles.emptyText}>No transports yet. Add your first transport.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => handleEdit(item)} style={[styles.card, cardShadow]}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <Ionicons name="car-outline" size={20} color={T.success} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.driverName || "Unknown Driver"}</Text>
                  <Text style={styles.meta}>{item.driverPhone}</Text>
                  {item.vehiclePlate && <Text style={styles.meta}>Plate: {item.vehiclePlate}</Text>}
                  {(item.vehicleBrand || item.vehicleModel) && (
                    <Text style={styles.meta}>{item.vehicleBrand} {item.vehicleModel}</Text>
                  )}
                </View>
                <Pressable
                  hitSlop={8}
                  onPress={() => Alert.alert("Delete Transport", `Remove ${item.driverName}?`, [
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
            <Text style={styles.modalTitle}>{editingItem ? "Edit Transport" : "Add Transport"}</Text>
            <Pressable onPress={() => setShowForm(false)} hitSlop={10}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Driver Name</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="John Doe"
                  placeholderTextColor={T.textMuted}
                  value={form.driverName}
                  onChangeText={(v) => setForm((f) => ({ ...f, driverName: v }))}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Driver Phone *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="+1..."
                  placeholderTextColor={T.textMuted}
                  value={form.driverPhone}
                  onChangeText={(v) => setForm((f) => ({ ...f, driverPhone: v }))}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Vehicle Plate</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="ABC-1234"
                placeholderTextColor={T.textMuted}
                value={form.vehiclePlate}
                onChangeText={(v) => setForm((f) => ({ ...f, vehiclePlate: v }))}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Vehicle Brand</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Mercedes"
                  placeholderTextColor={T.textMuted}
                  value={form.vehicleBrand}
                  onChangeText={(v) => setForm((f) => ({ ...f, vehicleBrand: v }))}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Vehicle Model</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Vito"
                  placeholderTextColor={T.textMuted}
                  value={form.vehicleModel}
                  onChangeText={(v) => setForm((f) => ({ ...f, vehicleModel: v }))}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Meeting Point</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Airport Terminal 2, Gate 5"
                placeholderTextColor={T.textMuted}
                value={form.meetingPointText}
                onChangeText={(v) => setForm((f) => ({ ...f, meetingPointText: v }))}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notes / Vehicle Info</Text>
              <TextInput
                style={[styles.fieldInput, styles.textArea]}
                placeholder="Black van, child seat available..."
                placeholderTextColor={T.textMuted}
                value={form.vehicleInfo}
                onChangeText={(v) => setForm((f) => ({ ...f, vehicleInfo: v }))}
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
              style={[styles.btnPrimary, { opacity: !form.driverPhone.trim() || mutation.isPending ? 0.6 : 1 }]}
              onPress={() => mutation.mutate(form)}
              disabled={!form.driverPhone.trim() || mutation.isPending}
            >
              {mutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnPrimaryText}>{editingItem ? "Save Changes" : "Add Transport"}</Text>
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
    width: 38, height: 38, borderRadius: T.r10, backgroundColor: "#05966918",
    alignItems: "center", justifyContent: "center",
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
