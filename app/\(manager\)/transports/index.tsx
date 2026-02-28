import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";

interface Transport {
  id: string;
  name: string;
  driverPhone?: string;
  vehicleInfo?: string;
}

interface TransportListResponse {
  rows: Transport[];
  total: number;
}

function TransportCard({
  transport,
  colors,
  onPress,
  onDelete,
}: {
  transport: Transport;
  colors: typeof Colors.light;
  onPress: () => void;
  onDelete: () => void;
}) {
  const [vehicleType, licensePlate] = (transport.vehicleInfo || "").split("|");

  return (
    <Pressable
      onLongPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.transportIcon, { backgroundColor: colors.accent + "15" }]}>
        <MaterialCommunityIcons name="van-utility" size={24} color={colors.accent} />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.name, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {transport.name}
        </Text>
        <View style={styles.cardMeta}>
          {vehicleType && (
            <View style={[styles.pill, { backgroundColor: colors.background }]}>
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{vehicleType}</Text>
            </View>
          )}
          {licensePlate && (
            <View style={[styles.pill, { backgroundColor: colors.background }]}>
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{licensePlate}</Text>
            </View>
          )}
        </View>
        {transport.driverPhone && (
          <View style={styles.metaItem}>
            <Feather name="phone" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {transport.driverPhone}
            </Text>
          </View>
        )}
      </View>
      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color={colors.error} />
      </Pressable>
    </Pressable>
  );
}

function TransportModal({
  visible,
  onClose,
  colors,
  transport,
}: {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.light;
  transport?: Transport | null;
}) {
  const qc = useQueryClient();
  const [vehicleTypeInitial, licensePlateInitial] = (transport?.vehicleInfo || "").split("|");

  const [form, setForm] = useState({
    name: transport?.name || "",
    phone: transport?.driverPhone || "",
    vehicleType: vehicleTypeInitial || "",
    licensePlate: licensePlateInitial || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const method = transport ? "PUT" : "POST";
      const url = transport ? `/v1/manager/transports/${transport.id}` : "/v1/manager/transports";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to save transport");
    },
  });

  const submit = () => {
    if (!form.name.trim()) {
      Alert.alert("Validation", "Name is required");
      return;
    }
    mutation.mutate(form);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {transport ? "Edit Transport" : "New Transport"}
          </Text>
          <Pressable onPress={submit} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.saveBtn, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>Save</Text>
            )}
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          <FormField
            label="Driver/Provider Name *"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. John's Shuttles"
            colors={colors}
          />
          <FormField
            label="Phone"
            value={form.phone}
            onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="+1 234 567 890"
            colors={colors}
            keyboardType="phone-pad"
          />
          <FormField
            label="Vehicle Type"
            value={form.vehicleType}
            onChangeText={(v) => setForm((f) => ({ ...f, vehicleType: v }))}
            placeholder="e.g. Mercedes Sprinter"
            colors={colors}
          />
          <FormField
            label="License Plate"
            value={form.licensePlate}
            onChangeText={(v) => setForm((f) => ({ ...f, licensePlate: v }))}
            placeholder="e.g. ABC-123"
            colors={colors}
            autoCapitalize="characters"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: typeof Colors.light;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType || "default"}
        autoCapitalize={autoCapitalize || "words"}
        style={[
          styles.textInput,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            fontFamily: "Inter_400Regular",
          },
        ]}
      />
    </View>
  );
}

export default function TransportsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<Transport | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<TransportListResponse>({
    queryKey: ["/v1/manager/transports"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/transports/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/transports"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to delete transport");
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = (transport: Transport) => {
    Alert.alert("Delete Transport", `Are you sure you want to delete ${transport.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(transport.id) },
    ]);
  };

  const handleEdit = (transport: Transport) => {
    setSelectedTransport(transport);
    setModalVisible(true);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading && !refreshing) return <LoadingView message="Loading transports..." />;
  if (error) return <ErrorView message="Failed to load transports" onRetry={refetch} />;

  const transports = data?.rows || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Transport</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={transports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransportCard
            transport={item}
            colors={colors}
            onPress={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={<EmptyState icon="car-outline" title="No transports found" subtitle="Tap the + button to add a driver" />}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent, bottom: bottomPad + 20 }]}
        onPress={() => {
          setSelectedTransport(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {modalVisible && (
        <TransportModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          colors={colors}
          transport={selectedTransport}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  title: { fontSize: 20 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  transportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  name: { fontSize: 16 },
  cardMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillText: { fontSize: 11 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13 },
  deleteBtn: { padding: 8 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalClose: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  modalTitle: { fontSize: 18 },
  saveBtn: { fontSize: 16 },
  modalBody: { padding: 16, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.5 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
  },
});
