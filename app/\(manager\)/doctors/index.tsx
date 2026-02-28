import React, { useState, useCallback, useRef } from "react";
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
import { Ionicons, Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  phone?: string;
  email?: string;
  bio?: string;
}

interface DoctorListResponse {
  rows: Doctor[];
  total: number;
}

function DoctorCard({
  doctor,
  colors,
  onPress,
  onDelete,
}: {
  doctor: Doctor;
  colors: typeof Colors.light;
  onPress: () => void;
  onDelete: () => void;
}) {
  const initials = doctor.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Pressable
      onLongPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
        <Text style={[styles.avatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.name, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
          {doctor.name}
        </Text>
        <Text style={[styles.specialty, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
          {doctor.specialty}
        </Text>
        <View style={styles.cardMeta}>
          {doctor.phone && (
            <View style={[styles.pill, { backgroundColor: colors.background }]}>
              <Feather name="phone" size={10} color={colors.textSecondary} />
              <Text style={[styles.pillText, { color: colors.textSecondary }]}>{doctor.phone}</Text>
            </View>
          )}
          {doctor.email && (
            <View style={[styles.pill, { backgroundColor: colors.background }]}>
              <Feather name="mail" size={10} color={colors.textSecondary} />
              <Text style={[styles.pillText, { color: colors.textSecondary }]} numberOfLines={1}>
                {doctor.email}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color={colors.error} />
      </Pressable>
    </Pressable>
  );
}

function DoctorModal({
  visible,
  onClose,
  colors,
  doctor,
}: {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.light;
  doctor?: Doctor | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: doctor?.name || "",
    specialty: doctor?.specialty || "",
    phone: doctor?.phone || "",
    email: doctor?.email || "",
    bio: doctor?.bio || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const method = doctor ? "PUT" : "POST";
      const url = doctor ? `/v1/manager/doctors/${doctor.id}` : "/v1/manager/doctors";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to save doctor");
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
            {doctor ? "Edit Doctor" : "New Doctor"}
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
            label="Full Name *"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Dr. John Doe"
            colors={colors}
          />
          <FormField
            label="Specialty *"
            value={form.specialty}
            onChangeText={(v) => setForm((f) => ({ ...f, specialty: v }))}
            placeholder="e.g. Cardiology"
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
            label="Email"
            value={form.email}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            placeholder="doctor@clinic.com"
            colors={colors}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormField
            label="Bio"
            value={form.bio}
            onChangeText={(v) => setForm((f) => ({ ...f, bio: v }))}
            placeholder="Doctor's biography..."
            colors={colors}
            multiline
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
        numberOfLines={multiline ? 4 : 1}
        style={[
          styles.textInput,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.text,
            fontFamily: "Inter_400Regular",
            height: multiline ? 100 : 44,
            textAlignVertical: multiline ? "top" : "center",
          },
        ]}
      />
    </View>
  );
}

export default function DoctorsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<DoctorListResponse>({
    queryKey: ["/v1/manager/doctors"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/v1/manager/doctors/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/doctors"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to delete doctor");
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleDelete = (doctor: Doctor) => {
    Alert.alert("Delete Doctor", `Are you sure you want to delete ${doctor.name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(doctor.id) },
    ]);
  };

  const handleEdit = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setModalVisible(true);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading && !refreshing) return <LoadingView message="Loading doctors..." />;
  if (error) return <ErrorView message="Failed to load doctors" onRetry={refetch} />;

  const doctors = data?.rows || [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Doctors</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        data={doctors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DoctorCard
            doctor={item}
            colors={colors}
            onPress={() => handleEdit(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={<EmptyState icon="medical-outline" title="No doctors found" subtitle="Tap the + button to add a doctor" />}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent, bottom: bottomPad + 20 }]}
        onPress={() => {
          setSelectedDoctor(null);
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {modalVisible && (
        <DoctorModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          colors={colors}
          doctor={selectedDoctor}
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18 },
  cardBody: { flex: 1, gap: 2 },
  name: { fontSize: 16 },
  specialty: { fontSize: 13 },
  cardMeta: { flexDirection: "row", gap: 8, marginTop: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pillText: { fontSize: 11 },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
});
