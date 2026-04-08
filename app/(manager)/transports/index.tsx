import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/adminTheme";
import { ManagerHeader } from "@/components/manager/ManagerHeader";
import { apiRequest } from "@/lib/query-client";
import { TransportListCard, type TransportItem } from "@/components/managerTransports/TransportListCard";
import {
  TransportFormSheet,
  type TransportFormData,
  type TransportFormItem,
} from "@/components/managerTransports/TransportFormSheet";
import { useT } from "@/hooks/useT";

interface TransportsResponse {
  rows: TransportItem[];
}

export default function TransportsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const t = useT();
  const tt = t.managerTransports;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<TransportFormItem | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery<TransportsResponse>({
    queryKey: ["/v1/manager/transports"],
  });

  const transports = data?.rows ?? [];

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), type === "error" ? 2000 : 1200);
  };

  const createMutation = useMutation({
    mutationFn: async (body: TransportFormData) => {
      const res = await apiRequest("POST", "/v1/manager/transports", body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] });
      setSheetVisible(false);
      setEditingItem(null);
      showToast(tt.toastAdded);
    },
    onError: (e: any) => showToast(e?.message ?? tt.toastFailedSave, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: TransportFormData }) => {
      const res = await apiRequest("PUT", `/v1/manager/transports/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] });
      setSheetVisible(false);
      setEditingItem(null);
      showToast(tt.toastUpdated);
    },
    onError: (e: any) => showToast(e?.message ?? tt.toastFailedUpdate, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/transports/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] });
      showToast(tt.toastRemoved);
    },
    onError: (e: any) => showToast(e?.message ?? tt.toastFailedDelete, "error"),
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setSheetVisible(true);
  };

  const handleOpenEdit = (item: TransportItem) => {
    setEditingItem({
      id: item.id,
      driverFullName: item.driverFullName,
      driverPhoneE164: item.driverPhoneE164,
      vehicleBrand: item.vehicleBrand,
      vehicleModel: item.vehicleModel,
      licensePlate: item.licensePlate,
    });
    setSheetVisible(true);
  };

  const handleSubmit = (formData: TransportFormData) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, body: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={styles.root}>
      <ManagerHeader
        title={tt.title}
        backButton
        onBack={() => router.back()}
        right={
          <Pressable
            style={({ pressed }) => [styles.addBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleOpenCreate}
            testID="btn-add-transport"
          >
            <Ionicons name="add" size={22} color={T.primary} />
          </Pressable>
        }
      />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={T.accent} size="large" />
          <Text style={styles.loadingText}>{tt.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={transports}
          keyExtractor={(tr) => tr.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: bottomPad + 40,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.accent} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="car-sport-outline" size={40} color={T.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>{tt.emptyTitle}</Text>
              <Text style={styles.emptySubtitle}>{tt.emptySubtitle}</Text>
              <Pressable
                style={({ pressed }) => [styles.emptyCta, { opacity: pressed ? 0.7 : 1 }]}
                onPress={handleOpenCreate}
              >
                <Ionicons name="add" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCtaText}>{tt.btnAddTransport}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <TransportListCard
              item={item}
              onEdit={handleOpenEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          )}
        />
      )}

      {toast && (
        <View
          style={[
            styles.toast,
            { bottom: insets.bottom + 24 },
            toast.type === "error" ? styles.toastError : styles.toastSuccess,
          ]}
        >
          <Ionicons
            name={toast.type === "error" ? "alert-circle-outline" : "checkmark-circle-outline"}
            size={16}
            color="#FFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      <TransportFormSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        editItem={editingItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: T.textMuted,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F0F2F5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_700Bold",
    color: T.text,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 8,
  },
  emptyCtaText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#FFFFFF",
  },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastSuccess: {
    backgroundColor: T.success,
  },
  toastError: {
    backgroundColor: T.danger,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#FFFFFF",
  },
});
