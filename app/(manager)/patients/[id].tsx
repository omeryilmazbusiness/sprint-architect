import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest } from "@/lib/query-client";

type TabType = "Overview" | "Assign" | "Appointments" | "Documents";

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  phone?: string;
  email?: string;
  nationality?: string;
  arrivalDate?: string;
  departureDate?: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  notes?: string;
}

interface Appointment {
  id: string;
  title: string;
  type: string;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED";
  startAt: string;
  endAt?: string;
  notes?: string;
  doctor?: { name: string };
}

interface Document {
  id: string;
  documentTypeId: string;
  status: "ASSIGNED" | "UPLOADED" | "APPROVED" | "REJECTED";
  documentType?: { name: string };
}

interface DocumentType {
  id: string;
  name: string;
  description: string;
}

interface Plan {
  id: string;
  hotelId: string | null;
  transportId: string | null;
  doctorId: string | null;
  hotel?: { name: string };
  transport?: { name: string };
  doctor?: { name: string };
}

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [refreshing, setRefreshing] = useState(false);

  const isDark = Colors.light.text === "#F0F6FC"; // Simple check, or useColorScheme
  const colors = Colors.light; // Default to light for now, but we'll use useColorScheme later if needed. 
  // Wait, I should use useColorScheme properly.
  
  // Re-fetch helpers
  const { data: patient, isLoading: loadingPatient, error: patientError, refetch: refetchPatient } = useQuery<Patient>({
    queryKey: [`/v1/manager/patients/${id}`],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPatient()]);
    setRefreshing(false);
  }, [refetchPatient, id]);

  if (loadingPatient) return <LoadingView />;
  if (patientError || !patient) return <ErrorView message="Failed to load patient" onRetry={refetchPatient} />;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
              {patient.fullName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontFamily: "Inter_500Medium" }]}>
              {patient.patientKey}
            </Text>
          </View>
          <StatusBadge status={patient.status} small />
        </View>

        {/* Custom Tab Bar */}
        <View style={styles.tabBar}>
          {(["Overview", "Assign", "Appointments", "Documents"] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                activeTab === tab && { borderBottomColor: colors.accent }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? colors.accent : colors.textSecondary, fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_500Medium" }
              ]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "Overview" && <OverviewTab patient={patient} colors={colors} />}
        {activeTab === "Assign" && <AssignTab patientId={id} colors={colors} />}
        {activeTab === "Appointments" && <AppointmentsTab patientId={id} colors={colors} />}
        {activeTab === "Documents" && <DocumentsTab patientId={id} colors={colors} />}
      </View>
    </View>
  );
}

function OverviewTab({ patient, colors }: { patient: Patient; colors: any }) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(patient);

  const mutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      await apiRequest("PUT", `/v1/manager/patients/${patient.id}`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${patient.id}`] });
      qc.invalidateQueries({ queryKey: ["/v1/manager/patients"] });
      setIsEditing(false);
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "Not set";

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>Information</Text>
          <Pressable onPress={() => { setForm(patient); setIsEditing(true); }}>
            <Feather name="edit-2" size={18} color={colors.accent} />
          </Pressable>
        </View>

        <InfoRow label="Full Name" value={patient.fullName} colors={colors} />
        <InfoRow label="Phone" value={patient.phone || "—"} colors={colors} />
        <InfoRow label="Email" value={patient.email || "—"} colors={colors} />
        <InfoRow label="Nationality" value={patient.nationality || "—"} colors={colors} />
        <InfoRow label="Arrival" value={formatDate(patient.arrivalDate)} colors={colors} />
        <InfoRow label="Departure" value={formatDate(patient.departureDate)} colors={colors} />
        
        <View style={styles.notesContainer}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Notes</Text>
          <Text style={[styles.infoValue, { color: colors.text, marginTop: 4 }]}>{patient.notes || "No notes provided."}</Text>
        </View>
      </View>

      <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setIsEditing(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Edit Patient</Text>
            <Pressable onPress={() => mutation.mutate(form)} disabled={mutation.isPending}>
              {mutation.isPending ? <ActivityIndicator size="small" color={colors.accent} /> : 
                <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>Save</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <FormField label="Full Name" value={form.fullName} onChangeText={v => setForm(f => ({...f, fullName: v}))} colors={colors} />
            <FormField label="Phone" value={form.phone || ""} onChangeText={v => setForm(f => ({...f, phone: v}))} colors={colors} keyboardType="phone-pad" />
            <FormField label="Email" value={form.email || ""} onChangeText={v => setForm(f => ({...f, email: v}))} colors={colors} keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Nationality" value={form.nationality || ""} onChangeText={v => setForm(f => ({...f, nationality: v}))} colors={colors} />
            <FormField label="Arrival Date (YYYY-MM-DD)" value={form.arrivalDate || ""} onChangeText={v => setForm(f => ({...f, arrivalDate: v}))} colors={colors} />
            <FormField label="Departure Date (YYYY-MM-DD)" value={form.departureDate || ""} onChangeText={v => setForm(f => ({...f, departureDate: v}))} colors={colors} />
            <FormField label="Notes" value={form.notes || ""} onChangeText={v => setForm(f => ({...f, notes: v}))} colors={colors} multiline />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, colors, multiline, keyboardType, autoCapitalize }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, height: multiline ? 100 : 45 }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function AssignTab({ patientId, colors }: { patientId: string; colors: any }) {
  const qc = useQueryClient();
  const { data: plan, isLoading } = useQuery<Plan>({
    queryKey: [`/v1/manager/patients/${patientId}/plan`],
  });

  const [pickerType, setPickerType] = useState<"doctor" | "hotel" | "transport" | null>(null);

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <AssignmentCard 
        title="Doctor" 
        name={plan?.doctor?.name} 
        icon="person-outline" 
        colors={colors} 
        onPress={() => setPickerType("doctor")} 
      />
      <AssignmentCard 
        title="Hotel" 
        name={plan?.hotel?.name} 
        icon="business-outline" 
        colors={colors} 
        onPress={() => setPickerType("hotel")} 
      />
      <AssignmentCard 
        title="Transport" 
        name={plan?.transport?.name} 
        icon="car-outline" 
        colors={colors} 
        onPress={() => setPickerType("transport")} 
      />

      {pickerType && (
        <PickerModal 
          type={pickerType} 
          currentId={pickerType === "doctor" ? plan?.doctorId : pickerType === "hotel" ? plan?.hotelId : plan?.transportId}
          patientId={patientId} 
          colors={colors} 
          onClose={() => setPickerType(null)} 
        />
      )}
    </ScrollView>
  );
}

function AssignmentCard({ title, name, icon, colors, onPress }: any) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 16 }]}>
      <View style={styles.assignmentHeader}>
        <View style={styles.assignmentTitleRow}>
          <Ionicons name={icon} size={20} color={colors.accent} />
          <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8, fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
        </View>
        <Pressable onPress={onPress} style={[styles.changeBtn, { backgroundColor: colors.accent + "15" }]}>
          <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Change</Text>
        </Pressable>
      </View>
      <Text style={[styles.assignmentName, { color: name ? colors.text : colors.textMuted }]}>
        {name || "Not assigned"}
      </Text>
    </View>
  );
}

function PickerModal({ type, currentId, patientId, colors, onClose }: any) {
  const qc = useQueryClient();
  const endpoint = type === "doctor" ? "/v1/manager/doctors" : type === "hotel" ? "/v1/manager/hotels" : "/v1/manager/transports";
  const assignRoute = `/v1/manager/patients/${patientId}/assign-${type}`;
  
  const { data, isLoading } = useQuery<{ rows: any[] }>({
    queryKey: [endpoint],
  });

  const mutation = useMutation({
    mutationFn: async (id: string | null) => {
      const bodyKey = `${type}Id`;
      await apiRequest("PUT", assignRoute, { [bodyKey]: id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${patientId}/plan`] });
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <Modal animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Select {type}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {isLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
          <FlatList
            data={data?.rows || []}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <Pressable 
                onPress={() => mutation.mutate(item.id)}
                style={[
                  styles.pickerItem, 
                  { backgroundColor: colors.card, borderColor: currentId === item.id ? colors.accent : colors.border }
                ]}
              >
                <Text style={[styles.pickerItemText, { color: colors.text }]}>{item.name}</Text>
                {currentId === item.id && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </Pressable>
            )}
            ListHeaderComponent={
              <Pressable 
                onPress={() => mutation.mutate(null)}
                style={[styles.pickerItem, { backgroundColor: colors.card, borderColor: !currentId ? colors.accent : colors.border, marginBottom: 12 }]}
              >
                <Text style={[styles.pickerItemText, { color: colors.error }]}>Unassign</Text>
                {!currentId && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </Pressable>
            }
          />
        )}
      </View>
    </Modal>
  );
}

function AppointmentsTab({ patientId, colors }: { patientId: string; colors: any }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { data: appointments, isLoading, refetch } = useQuery<Appointment[]>({
    queryKey: [`/v1/manager/patients/${patientId}/appointments`],
  });

  const deleteMutation = useMutation({
    mutationFn: async (apptId: string) => {
      await apiRequest("DELETE", `/v1/manager/appointments/${apptId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${patientId}/appointments`] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const handleDelete = (id: string) => {
    Alert.alert("Delete Appointment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) }
    ]);
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={appointments}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.tabContent, { paddingBottom: 100 }]}
        renderItem={({ item }) => (
          <Pressable 
            onLongPress={() => handleDelete(item.id)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>{item.title}</Text>
              <StatusBadge status={item.status} small />
            </View>
            <View style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.cardMetaText, { color: colors.textSecondary }]}>
                {new Date(item.startAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{item.type}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title="No appointments" subtitle="Tap + to schedule one" icon="calendar-outline" />}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      />
      
      <Pressable 
        style={[styles.fab, { backgroundColor: colors.accent, bottom: 20, right: 20 }]}
        onPress={() => setShowCreate(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <CreateAppointmentModal 
        visible={showCreate} 
        onClose={() => setShowCreate(false)} 
        patientId={patientId} 
        colors={colors} 
      />
    </View>
  );
}

function CreateAppointmentModal({ visible, onClose, patientId, colors }: any) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: "", type: "Consultation", startAt: "", notes: "" });
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/v1/manager/appointments", { ...data, patientId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${patientId}/appointments`] });
      onClose();
      setForm({ title: "", type: "Consultation", startAt: "", notes: "" });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>New Appointment</Text>
          <Pressable onPress={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? <ActivityIndicator size="small" color={colors.accent} /> : 
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>Create</Text>}
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <FormField label="Title" value={form.title} onChangeText={(v: any) => setForm(f => ({...f, title: v}))} colors={colors} />
          <FormField label="Type" value={form.type} onChangeText={(v: any) => setForm(f => ({...f, type: v}))} colors={colors} />
          <FormField label="Start Time (YYYY-MM-DD HH:MM)" value={form.startAt} onChangeText={(v: any) => setForm(f => ({...f, startAt: v}))} colors={colors} />
          <FormField label="Notes" value={form.notes} onChangeText={(v: any) => setForm(f => ({...f, notes: v}))} colors={colors} multiline />
        </ScrollView>
      </View>
    </Modal>
  );
}

function DocumentsTab({ patientId, colors }: { patientId: string; colors: any }) {
  const qc = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const { data: documents, isLoading, refetch } = useQuery<Document[]>({
    queryKey: [`/v1/manager/patients/${patientId}/documents`],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ docId, status }: { docId: string; status: string }) => {
      await apiRequest("PUT", `/v1/manager/documents/${docId}`, { status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${patientId}/documents`] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.tabContent, { paddingBottom: 100 }]}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                {item.documentType?.name || "Unknown Document"}
              </Text>
              <StatusBadge status={item.status as any} small />
            </View>
            
            {item.status === "ASSIGNED" && (
              <View style={styles.docActions}>
                <Pressable 
                  onPress={() => updateStatusMutation.mutate({ docId: item.id, status: "APPROVED" })}
                  style={[styles.docBtn, { backgroundColor: colors.success + "15" }]}
                >
                  <Text style={{ color: colors.success, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Approve</Text>
                </Pressable>
                <Pressable 
                  onPress={() => updateStatusMutation.mutate({ docId: item.id, status: "REJECTED" })}
                  style={[styles.docBtn, { backgroundColor: colors.error + "15" }]}
                >
                  <Text style={{ color: colors.error, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Reject</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No documents" subtitle="Assign required documents for this patient" icon="document-text-outline" />}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      />

      <View style={[styles.bottomBar, { backgroundColor: colors.background, paddingBottom: 20 }]}>
        <Pressable 
          onPress={() => setShowAssign(true)}
          style={[styles.mainBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.mainBtnText}>Assign Documents</Text>
        </Pressable>
      </View>

      <AssignDocumentsModal 
        visible={showAssign} 
        onClose={() => setShowAssign(false)} 
        patientId={patientId} 
        colors={colors} 
      />
    </View>
  );
}

function AssignDocumentsModal({ visible, onClose, patientId, colors }: any) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  
  const { data: types, isLoading } = useQuery<DocumentType[]>({
    queryKey: ["/v1/manager/document-types"],
  });

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/v1/manager/patients/${patientId}/assign-documents`, { documentTypeIds: selected });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${patientId}/documents`] });
      onClose();
      setSelected([]);
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          <Text style={[styles.modalTitle, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Assign Docs</Text>
          <Pressable onPress={() => mutation.mutate()} disabled={mutation.isPending || selected.length === 0}>
            {mutation.isPending ? <ActivityIndicator size="small" color={colors.accent} /> : 
              <Text style={{ color: selected.length > 0 ? colors.accent : colors.textMuted, fontFamily: "Inter_600SemiBold" }}>Assign</Text>}
          </Pressable>
        </View>
        
        {isLoading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
          <FlatList
            data={types || []}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <Pressable 
                onPress={() => toggle(item.id)}
                style={[
                  styles.pickerItem, 
                  { backgroundColor: colors.card, borderColor: selected.includes(item.id) ? colors.accent : colors.border }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{item.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.description}</Text>
                </View>
                {selected.includes(item.id) && <Ionicons name="checkmark-circle" size={20} color={colors.accent} />}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, borderBottomWidth: 1 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  backBtn: { marginRight: 15 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontSize: 20 },
  headerSubtitle: { fontSize: 13 },
  tabBar: { flexDirection: "row", justifyContent: "space-between" },
  tabItem: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13 },
  tabContent: { padding: 20 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionTitle: { fontSize: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  notesContainer: { marginTop: 15 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18 },
  modalBody: { padding: 20, gap: 16 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  assignmentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  assignmentTitleRow: { flexDirection: "row", alignItems: "center" },
  changeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  assignmentName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  pickerItem: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  pickerItemText: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 15 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  cardMetaText: { fontSize: 12 },
  cardSubtitle: { fontSize: 13 },
  fab: { position: "absolute", width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 4, shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  docActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  docBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bottomBar: { padding: 20, position: "absolute", bottom: 0, left: 0, right: 0 },
  mainBtn: { height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  mainBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
