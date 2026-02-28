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

interface Hotel {
  id: string;
  name: string;
  stars: number;
  address?: string;
  phone?: string;
  website?: string;
}

interface HotelListResponse {
  rows: Hotel[];
  total: number;
}

function StarRating({ stars, colors }: { stars: number; colors: typeof Colors.light }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= stars ? "star" : "star-outline"}
          size={14}
          color={s <= stars ? "#FFD700" : colors.textMuted}
        />
      ))}
    </View>
  );
}

function HotelCard({
  hotel,
  colors,
  onPress,
  onDelete,
}: {
  hotel: Hotel;
  colors: typeof Colors.light;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onLongPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.hotelIcon, { backgroundColor: colors.primary + "15" }]}>
        <MaterialCommunityIcons name="office-building" size={24} color={colors.primary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.name, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {hotel.name}
          </Text>
          <StarRating stars={hotel.stars} colors={colors} />
        </View>
        {hotel.address && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {hotel.address}
            </Text>
          </View>
        )}
        {hotel.phone && (
          <View style={styles.metaItem}>
            <Feather name="phone" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              {hotel.phone}
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

function HotelModal({
  visible,
  onClose,
  colors,
  hotel,
}: {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.light;
  hotel?: Hotel | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: hotel?.name || "",
    stars: hotel?.stars?.toString() || "3",
    address: hotel?.address || "",
    phone: hotel?.phone || "",
    website: hotel?.website || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const method = hotel ? "PUT" : "POST";
      const url = hotel ? `/v1/manager/hotels/${hotel.id}` : "/v1/manager/hotels";
      const res = await apiRequest(method, url, { ...data, stars: parseInt(data.stars) });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/hotels"] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to save hotel");
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
            {hotel ? "Edit Hotel" : "New Hotel"}
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
            label="Hotel Name *"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Grand Plaza Hotel"
            colors={colors}
          />
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>Stars (1-5) *</Text>
            <View style={styles.starsInput}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setForm((f) => ({ ...f, stars: s.toString() }))}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={parseInt(form.stars) >= s ? "star" : "star-outline"}
                    size={28}
                    color={parseInt(form.stars) >= s ? "#FFD700" : colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
          <FormField
            label="Address"
            value={form.address}
            onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
            placeholder="Street name and number"
            colors={colors}
            multiline
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
            label="Website"
            value={form.website}
            onChangeText={(v) => setForm((f) => ({ ...f, website: v }))}
            placeholder="https://example.com"
            colors={colors}
            keyboardType="url"
            autoCapitalize="none"
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
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: typeof Colors.light;
  keyboardType?: any;
  autoCapitalize?: any;
  multiline?: boolean;
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
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[
          styles.textInput,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            fontFamily: "Inter_400Regular",
            height: multiline ? 80 : 44,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

export default function HotelsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<HotelListResponse>({
    queryKey: ["/v1/manager/hotels"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/hotels/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/hotels"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to delete hotel");
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = (hotel: Hotel) => {
    Alert.alert("Delete Hotel", `Are you sure you want to delete ${hotel.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(hotel.id) },
    ]);
  };

  const handleEdit = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setModalVisible(true);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading && !refreshing) return <LoadingView message="Loading hotels..." />;
  if (error) return <ErrorView message="Failed to load hotels" onRetry={refetch} />;

  const hotels = data?.rows || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Hotels</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={hotels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HotelCard
            hotel={item}
            colors={colors}
            onPress={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={<EmptyState icon="bed-outline" title="No hotels found" subtitle="Tap the + button to add a hotel" />}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent, bottom: bottomPad + 20 }]}
        onPress={() => {
          setSelectedHotel(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {modalVisible && (
        <HotelModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          colors={colors}
          hotel={selectedHotel}
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
  hotelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 16, flex: 1 },
  stars: { flexDirection: "row", gap: 2 },
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
    paddingVertical: 8,
    fontSize: 15,
  },
  starsInput: { flexDirection: "row", gap: 12, paddingTop: 4 },
  starBtn: { padding: 4 },
});
