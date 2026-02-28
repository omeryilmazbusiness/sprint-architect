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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { apiRequest } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  clinicId: string;
  phone?: string;
  email?: string;
  nationality?: string;
  arrivalDate?: string;
  departureDate?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  notes?: string;
  createdAt: string;
}

interface PatientListResponse {
  rows: Patient[];
  total: number;
  page: number;
  pageSize: number;
}

function formatDate(s?: string): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function PatientCard({ patient, colors, onPress }: { patient: Patient; colors: typeof Colors.light; onPress: () => void }) {
  const initials = patient.fullName
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 },
      ]}
      testID={`patient-card-${patient.id}`}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
        <Text style={[styles.avatarText, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>{initials}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={[styles.name, { color: colors.text, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
            {patient.fullName}
          </Text>
          <StatusBadge status={patient.status} />
        </View>
        <Text style={[styles.key, { color: colors.accent, fontFamily: "Inter_500Medium" }]}>
          {patient.patientKey}
        </Text>
        <View style={styles.cardMeta}>
          {patient.arrivalDate && (
            <View style={styles.metaItem}>
              <Ionicons name="airplane-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {formatDate(patient.arrivalDate)}
              </Text>
            </View>
          )}
          {patient.nationality && (
            <View style={styles.metaItem}>
              <Ionicons name="flag-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {patient.nationality}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

interface CreatePatientForm {
  fullName: string;
  phone: string;
  email: string;
  nationality: string;
  arrivalDate: string;
  departureDate: string;
  notes: string;
}

function CreatePatientModal({ visible, onClose, colors, clinicId }: {
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.light;
  clinicId: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreatePatientForm>({
    fullName: "", phone: "", email: "", nationality: "", arrivalDate: "", departureDate: "", notes: "",
  });
  const [created, setCreated] = useState<Patient | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: Partial<CreatePatientForm>) => {
      const res = await apiRequest("POST", "/v1/manager/patients", data);
      return res.json() as Promise<Patient>;
    },
    onSuccess: (patient) => {
      qc.invalidateQueries({ queryKey: ["/v1/manager/patients"] });
      setCreated(patient);
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to create patient");
    },
  });

  function resetAndClose() {
    setForm({ fullName: "", phone: "", email: "", nationality: "", arrivalDate: "", departureDate: "", notes: "" });
    setCreated(null);
    mutation.reset();
    onClose();
  }

  function submit() {
    if (!form.fullName.trim()) {
      Alert.alert("Validation", "Full name is required");
      return;
    }
    const payload: Record<string, string> = { fullName: form.fullName.trim() };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.nationality.trim()) payload.nationality = form.nationality.trim();
    if (form.arrivalDate.trim()) payload.arrivalDate = form.arrivalDate.trim();
    if (form.departureDate.trim()) payload.departureDate = form.departureDate.trim();
    if (form.notes.trim()) payload.notes = form.notes.trim();
    mutation.mutate(payload);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={resetAndClose} style={styles.modalClose} testID="close-create-modal">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            {created ? "Patient Created" : "New Patient"}
          </Text>
          {!created && (
            <Pressable onPress={submit} disabled={mutation.isPending} testID="submit-create-patient">
              {mutation.isPending
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Text style={[styles.saveBtn, { color: colors.accent, fontFamily: "Inter_600SemiBold" }]}>Save</Text>
              }
            </Pressable>
          )}
          {created && <View style={{ width: 44 }} />}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {created ? (
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: colors.success + "20" }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
                Patient Registered
              </Text>
              <Text style={[styles.successName, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {created.fullName}
              </Text>
              <View style={[styles.keyCard, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}>
                <Text style={[styles.keyLabel, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                  PATIENT KEY
                </Text>
                <Text style={[styles.keyValue, { color: colors.accent, fontFamily: "Inter_700Bold" }]}>
                  {created.patientKey}
                </Text>
                <Text style={[styles.keyHint, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Share this key with the patient to log into the app
                </Text>
              </View>
              <Pressable
                onPress={resetAndClose}
                style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                testID="done-button"
              >
                <Text style={[styles.doneBtnText, { fontFamily: "Inter_600SemiBold" }]}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <FormField label="Full Name *" value={form.fullName} onChangeText={v => setForm(f => ({ ...f, fullName: v }))} placeholder="e.g. Sarah Mitchell" colors={colors} testID="input-fullname" />
              <FormField label="Phone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} placeholder="+44 20 7946 0000" colors={colors} keyboardType="phone-pad" />
              <FormField label="Email" value={form.email} onChangeText={v => setForm(f => ({ ...f, email: v }))} placeholder="patient@example.com" colors={colors} keyboardType="email-address" autoCapitalize="none" />
              <FormField label="Nationality" value={form.nationality} onChangeText={v => setForm(f => ({ ...f, nationality: v }))} placeholder="e.g. British" colors={colors} />
              <FormField label="Arrival Date" value={form.arrivalDate} onChangeText={v => setForm(f => ({ ...f, arrivalDate: v }))} placeholder="YYYY-MM-DD" colors={colors} />
              <FormField label="Departure Date" value={form.departureDate} onChangeText={v => setForm(f => ({ ...f, departureDate: v }))} placeholder="YYYY-MM-DD" colors={colors} />
              <FormField label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} placeholder="Optional notes..." colors={colors} multiline />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function FormField({ label, value, onChangeText, placeholder, colors, keyboardType, autoCapitalize, multiline, testID }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string;
  colors: typeof Colors.light; keyboardType?: any; autoCapitalize?: any; multiline?: boolean; testID?: string;
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
        testID={testID}
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

export default function PatientsScreen() {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER" || user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearch(text: string) {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(text), 400);
  }

  const queryKey = debouncedSearch
    ? ["/v1/manager/patients", `?search=${encodeURIComponent(debouncedSearch)}`]
    : ["/v1/manager/patients"];

  const { data, isLoading, error, refetch } = useQuery<PatientListResponse>({
    queryKey,
    enabled: isManager,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const patients = data?.rows ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Patients</Text>
            {data && (
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
                {data.total} total
              </Text>
            )}
          </View>
          {isManager && (
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              testID="add-patient-button"
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          )}
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder="Search by name or patient key..."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.text, fontFamily: "Inter_400Regular" }]}
            testID="patient-search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => { setSearch(""); setDebouncedSearch(""); }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {error && !isLoading && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Failed to load patients
          </Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.retryText, { fontFamily: "Inter_600SemiBold" }]}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !error && (
        <FlatList
          data={patients}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PatientCard
              patient={item}
              colors={colors}
              onPress={() => router.push(`/(manager)/patients/${item.id}` as any)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 16 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
                {debouncedSearch ? "No patients match your search" : "No patients yet"}
              </Text>
              {!debouncedSearch && isManager && (
                <Text style={[styles.emptyHint, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
                  Tap + to register the first patient
                </Text>
              )}
            </View>
          }
          scrollEnabled
          showsVerticalScrollIndicator={false}
        />
      )}

      {isManager && (
        <CreatePatientModal
          visible={showCreate}
          onClose={() => setShowCreate(false)}
          colors={colors}
          clinicId={user?.clinicId ?? ""}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 28 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16 },
  cardBody: { flex: 1, gap: 4 },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { fontSize: 15, flex: 1 },
  key: { fontSize: 12 },
  cardMeta: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 15, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#fff", fontSize: 14 },
  empty: { alignItems: "center", gap: 8, paddingTop: 60 },
  emptyText: { fontSize: 16 },
  emptyHint: { fontSize: 13 },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  modalClose: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  modalTitle: { fontSize: 18 },
  saveBtn: { fontSize: 16 },
  modalBody: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, letterSpacing: 0.5 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  successContainer: { alignItems: "center", gap: 16, paddingTop: 24 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 22 },
  successName: { fontSize: 15 },
  keyCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  keyLabel: { fontSize: 11, letterSpacing: 0.8 },
  keyValue: { fontSize: 28, letterSpacing: 2 },
  keyHint: { fontSize: 12, textAlign: "center" },
  doneBtn: { width: "100%", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 16 },
});
