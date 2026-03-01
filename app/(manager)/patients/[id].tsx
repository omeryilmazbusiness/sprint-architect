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
  Linking,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { StatusPill, Card, SectionHeader, ListRow, PrimaryButton } from "@/components/ui";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";

type TabType = "Overview" | "Care Team" | "Appointments" | "Documents" | "Tracking";

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
  doctor?: { id: string; fullName: string };
}

interface Document {
  id: string;
  documentTypeId: string;
  status: "ASSIGNED" | "UPLOADED" | "APPROVED" | "REJECTED";
  fileUrl?: string;
  rejectionReason?: string;
  documentType?: { id: string; name: string; isRequired: boolean };
}

interface Plan {
  id?: string;
  hotelId: string | null;
  transportId: string | null;
  doctorId: string | null;
  hotel?: { id: string; name: string };
  transport?: { id: string; name: string };
  doctor?: { id: string; fullName: string; specialty?: string; phone?: string };
  checkInDate?: string;
  checkOutDate?: string;
  roomNo?: string;
  hotelStayDays?: number;
  currentStep?: string;
}

interface AggregateData {
  patient: Patient;
  plan: Plan | null;
  doctor: any;
  hotel: any;
  transport: any;
  documents: Document[];
  appointments: Appointment[];
  tracking: { currentStep: string | null };
}

const TRACKING_STEPS = [
  { key: "PRE_ARRIVAL", label: "Pre-Arrival", icon: "airplane-outline" as const },
  { key: "ARRIVAL_TRANSFER", label: "Arrival & Transfer", icon: "car-outline" as const },
  { key: "HOTEL_CHECKIN", label: "Hotel Check-in", icon: "business-outline" as const },
  { key: "TREATMENT", label: "Treatment", icon: "medical-outline" as const },
  { key: "FOLLOWUP", label: "Follow-up", icon: "calendar-outline" as const },
  { key: "DEPARTURE", label: "Departure", icon: "airplane" as const },
];

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("Overview");
  const [refreshing, setRefreshing] = useState(false);

  const { data: aggregate, isLoading, error, refetch } = useQuery<AggregateData>({
    queryKey: [`/v1/manager/patients/${id}/details`],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) return <LoadingView />;
  if (error || !aggregate) return <ErrorView message="Failed to load patient details" onRetry={refetch} />;

  const { patient, plan, documents, appointments, tracking } = aggregate;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return "Dates not set";
    const s = start ? new Date(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : "?";
    const e = end ? new Date(end).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : "?";
    return `${s} → ${e}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Premium Header */}
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: T.surface, borderBottomColor: T.border }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: T.text, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
              {patient.fullName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: T.textMuted, fontFamily: "Inter_500Medium" }]}>
              {formatDateRange(patient.arrivalDate, patient.departureDate)}
            </Text>
          </View>
          <StatusPill status={patient.status} small />
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: T.primary + "10" }]}
            onPress={() => setActiveTab("Care Team")}
          >
            <Ionicons name="person-add-outline" size={16} color={T.primary} />
            <Text style={[styles.quickActionText, { color: T.primary }]}>Change Doctor</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionBtn, { backgroundColor: T.accent + "10" }]}
            onPress={() => setActiveTab("Appointments")}
          >
            <Ionicons name="calendar-outline" size={16} color={T.accent} />
            <Text style={[styles.quickActionText, { color: T.accent }]}>New Appt</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Tab Bar */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabBarScroll}
          contentContainerStyle={styles.tabBarContent}
        >
          {(["Overview", "Care Team", "Appointments", "Documents", "Tracking"] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                activeTab === tab && { borderBottomColor: T.primary }
              ]}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? T.primary : T.textMuted, fontFamily: activeTab === tab ? "Inter_600SemiBold" : "Inter_500Medium" }
              ]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "Overview" && (
          <OverviewTab 
            patient={patient} 
            onUpdate={() => qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${id}/details`] })} 
          />
        )}
        {activeTab === "Care Team" && (
          <CareTeamTab 
            patientId={id} 
            plan={plan}
            onUpdate={() => qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${id}/details`] })}
          />
        )}
        {activeTab === "Appointments" && (
          <AppointmentsTab 
            patientId={id} 
            appointments={appointments}
            onUpdate={() => qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${id}/details`] })}
          />
        )}
        {activeTab === "Documents" && (
          <DocumentsTab 
            patientId={id} 
            documents={documents}
            onUpdate={() => qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${id}/details`] })}
          />
        )}
        {activeTab === "Tracking" && (
          <TrackingTab 
            patientId={id} 
            currentStep={tracking?.currentStep || null}
            arrivalDate={patient.arrivalDate}
            departureDate={patient.departureDate}
            onUpdate={() => qc.invalidateQueries({ queryKey: [`/v1/manager/patients/${id}/details`] })}
          />
        )}
      </View>
    </View>
  );
}

function OverviewTab({ patient, onUpdate }: { patient: Patient; onUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(patient);

  const mutation = useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      await apiRequest("PUT", `/v1/manager/patients/${patient.id}`, data);
    },
    onSuccess: () => {
      onUpdate();
      setIsEditing(false);
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "Not set";

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Card style={{ marginBottom: 16 }}>
        <View style={styles.sectionHeader}>
          <SectionHeader label="Information" />
          <Pressable onPress={() => { setForm(patient); setIsEditing(true); }}>
            <Feather name="edit-2" size={18} color={T.primary} />
          </Pressable>
        </View>

        <InfoRow label="Full Name" value={patient.fullName} />
        <InfoRow label="Phone" value={patient.phone || "—"} />
        <InfoRow label="Email" value={patient.email || "—"} />
        <InfoRow label="Nationality" value={patient.nationality || "—"} />
        <InfoRow label="Arrival" value={formatDate(patient.arrivalDate)} />
        <InfoRow label="Departure" value={formatDate(patient.departureDate)} />
        
        <View style={styles.notesContainer}>
          <Text style={[styles.infoLabel, { color: T.textMuted }]}>Notes</Text>
          <Text style={[styles.infoValue, { color: T.text, marginTop: 4 }]}>{patient.notes || "No notes provided."}</Text>
        </View>
      </Card>

      <Modal visible={isEditing} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalRoot, { backgroundColor: T.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: T.border, backgroundColor: T.surface }]}>
            <Pressable onPress={() => setIsEditing(false)}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: T.text, fontFamily: "Inter_700Bold" }]}>Edit Patient</Text>
            <Pressable onPress={() => mutation.mutate(form)} disabled={mutation.isPending}>
              {mutation.isPending ? <ActivityIndicator size="small" color={T.primary} /> : 
                <Text style={{ color: T.primary, fontFamily: "Inter_600SemiBold" }}>Save</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <FormField label="Full Name" value={form.fullName} onChangeText={(v: string) => setForm(f => ({...f, fullName: v}))} />
            <FormField label="Phone" value={form.phone || ""} onChangeText={(v: string) => setForm(f => ({...f, phone: v}))} keyboardType="phone-pad" />
            <FormField label="Email" value={form.email || ""} onChangeText={(v: string) => setForm(f => ({...f, email: v}))} keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Nationality" value={form.nationality || ""} onChangeText={(v: string) => setForm(f => ({...f, nationality: v}))} />
            <FormField label="Arrival Date (YYYY-MM-DD)" value={form.arrivalDate || ""} onChangeText={(v: string) => setForm(f => ({...f, arrivalDate: v}))} />
            <FormField label="Departure Date (YYYY-MM-DD)" value={form.departureDate || ""} onChangeText={(v: string) => setForm(f => ({...f, departureDate: v}))} />
            <FormField label="Notes" value={form.notes || ""} onChangeText={(v: string) => setForm(f => ({...f, notes: v}))} multiline />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: T.border }]}>
      <Text style={[styles.infoLabel, { color: T.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: T.text }]}>{value}</Text>
    </View>
  );
}

function FormField({ label, value, onChangeText, multiline, keyboardType, autoCapitalize }: any) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: T.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: T.surface, borderColor: T.border, color: T.text, height: multiline ? 100 : 45 }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function CareTeamTab({ patientId, plan, onUpdate }: { patientId: string; plan: Plan | null; onUpdate: () => void }) {
  const [pickerType, setPickerType] = useState<"doctor" | "hotel" | "transport" | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Card style={{ marginBottom: 16 }}>
        <AssignmentCard 
          title="Doctor" 
          name={plan?.doctor?.fullName} 
          subtitle={plan?.doctor?.specialty}
          phone={plan?.doctor?.phone}
          icon="person-outline" 
          onPress={() => setPickerType("doctor")} 
        />
        <View style={{ height: 16 }} />
        <AssignmentCard 
          title="Hotel" 
          name={plan?.hotel?.name} 
          subtitle={plan?.roomNo ? `Room: ${plan.roomNo}` : undefined}
          dateRange={plan?.checkInDate ? formatDateRangeForPlan(plan.checkInDate, plan.checkOutDate) : undefined}
          icon="business-outline" 
          onPress={() => setPickerType("hotel")} 
        />
        <View style={{ height: 16 }} />
        <AssignmentCard 
          title="Transport" 
          name={plan?.transport?.name} 
          icon="car-outline" 
          onPress={() => setPickerType("transport")} 
        />
      </Card>

      {pickerType && (
        <PickerModal 
          type={pickerType} 
          currentId={pickerType === "doctor" ? plan?.doctorId : pickerType === "hotel" ? plan?.hotelId : plan?.transportId}
          patientId={patientId} 
          onClose={() => setPickerType(null)}
          onUpdate={onUpdate}
        />
      )}
    </ScrollView>
  );
}

function formatDateRangeForPlan(start?: string, end?: string) {
  if (!start && !end) return "";
  const s = start ? new Date(start).toLocaleDateString() : "?";
  const e = end ? new Date(end).toLocaleDateString() : "?";
  return `${s} - ${e}`;
}

function AssignmentCard({ title, name, subtitle, phone, dateRange, icon, onPress }: any) {
  return (
    <View style={styles.assignmentContainer}>
      <View style={styles.assignmentHeader}>
        <View style={styles.assignmentTitleRow}>
          <View style={[styles.iconWrap, { backgroundColor: T.primary + "10" }]}>
            <Ionicons name={icon} size={20} color={T.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: T.text, marginLeft: 12, fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
        </View>
        <TouchableOpacity onPress={onPress} style={[styles.changeBtn, { backgroundColor: T.primary + "10" }]}>
          <Text style={{ color: T.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>Change</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.assignmentBody}>
        <Text style={[styles.assignmentName, { color: name ? T.text : T.textMuted }]}>
          {name || "Not assigned"}
        </Text>
        {subtitle && <Text style={[styles.assignmentSub, { color: T.textMuted }]}>{subtitle}</Text>}
        {dateRange && <Text style={[styles.assignmentSub, { color: T.textMuted, marginTop: 4 }]}>{dateRange}</Text>}
        
        {phone && name && (
          <TouchableOpacity 
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Ionicons name="call" size={16} color={T.success} />
            <Text style={[styles.callBtnText, { color: T.success }]}>{phone}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PickerModal({ type, currentId, patientId, onClose, onUpdate }: any) {
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
      onUpdate();
      onClose();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <Modal animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: T.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: T.border, backgroundColor: T.surface }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={T.text} /></Pressable>
          <Text style={[styles.modalTitle, { color: T.text, fontFamily: "Inter_700Bold" }]}>Select {type}</Text>
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
                  { backgroundColor: T.surface, borderColor: currentId === item.id ? T.primary : T.border }
                ]}
              >
                <Text style={[styles.pickerItemText, { color: T.text }]}>{item.fullName || item.name}</Text>
                {currentId === item.id && <Ionicons name="checkmark-circle" size={20} color={T.primary} />}
              </Pressable>
            )}
            ListHeaderComponent={
              <Pressable 
                onPress={() => mutation.mutate(null)}
                style={[styles.pickerItem, { backgroundColor: T.surface, borderColor: !currentId ? T.primary : T.border, marginBottom: 12 }]}
              >
                <Text style={[styles.pickerItemText, { color: T.danger }]}>Unassign</Text>
                {!currentId && <Ionicons name="checkmark-circle" size={20} color={T.primary} />}
              </Pressable>
            }
          />
        )}
      </View>
    </Modal>
  );
}

function AppointmentsTab({ patientId, appointments, onUpdate }: { patientId: string; appointments: Appointment[]; onUpdate: () => void }) {
  const [showCreate, setShowCreate] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (apptId: string) => {
      await apiRequest("DELETE", `/v1/manager/appointments/${apptId}`);
    },
    onSuccess: () => {
      onUpdate();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const handleDelete = (id: string) => {
    Alert.alert("Delete Appointment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) }
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={appointments}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.tabContent, { paddingBottom: 100 }]}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <Pressable 
              onLongPress={() => handleDelete(item.id)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: T.text, fontFamily: "Inter_600SemiBold" }]}>{item.title}</Text>
                <StatusPill status={item.status} small />
              </View>
              <View style={styles.cardMeta}>
                <Ionicons name="calendar-outline" size={14} color={T.textMuted} />
                <Text style={[styles.cardMetaText, { color: T.textMuted }]}>
                  {new Date(item.startAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </Text>
              </View>
              <Text style={[styles.cardSubtitle, { color: T.textMuted }]}>{item.type}</Text>
              {item.doctor && (
                <View style={[styles.cardMeta, { marginTop: 4 }]}>
                  <Ionicons name="person-outline" size={14} color={T.textMuted} />
                  <Text style={[styles.cardMetaText, { color: T.textMuted }]}>{item.doctor.fullName}</Text>
                </View>
              )}
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={<EmptyState title="No appointments" subtitle="Tap + to schedule one" icon="calendar-outline" />}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onUpdate} />}
      />
      
      <Pressable 
        style={[styles.fab, { backgroundColor: T.primary, bottom: 20, right: 20 }]}
        onPress={() => setShowCreate(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      <CreateAppointmentModal 
        visible={showCreate} 
        onClose={() => setShowCreate(false)} 
        patientId={patientId} 
        onUpdate={onUpdate}
      />
    </View>
  );
}

function CreateAppointmentModal({ visible, onClose, patientId, onUpdate }: any) {
  const [form, setForm] = useState({ title: "", type: "Consultation", startAt: "", notes: "" });
  
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/v1/manager/appointments", { ...data, patientId });
    },
    onSuccess: () => {
      onUpdate();
      onClose();
      setForm({ title: "", type: "Consultation", startAt: "", notes: "" });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: T.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: T.border, backgroundColor: T.surface }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={24} color={T.text} /></Pressable>
          <Text style={[styles.modalTitle, { color: T.text, fontFamily: "Inter_700Bold" }]}>New Appointment</Text>
          <Pressable onPress={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? <ActivityIndicator size="small" color={T.primary} /> : 
              <Text style={{ color: T.primary, fontFamily: "Inter_600SemiBold" }}>Create</Text>}
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>
          <FormField label="Title" value={form.title} onChangeText={(v: any) => setForm(f => ({...f, title: v}))} />
          <FormField label="Type" value={form.type} onChangeText={(v: any) => setForm(f => ({...f, type: v}))} />
          <FormField label="Start Time (YYYY-MM-DD HH:MM)" value={form.startAt} onChangeText={(v: any) => setForm(f => ({...f, startAt: v}))} />
          <FormField label="Notes" value={form.notes} onChangeText={(v: any) => setForm(f => ({...f, notes: v}))} multiline />
        </ScrollView>
      </View>
    </Modal>
  );
}

function DocumentsTab({ patientId, documents, onUpdate }: { patientId: string; documents: Document[]; onUpdate: () => void }) {
  const { accessToken } = useAuth();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ docId, status, rejectionReason }: { docId: string; status: string; rejectionReason?: string }) => {
      await apiRequest("PUT", `/v1/manager/documents/${docId}`, { status, rejectionReason });
    },
    onSuccess: () => {
      onUpdate();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const handleReject = (docId: string) => {
    Alert.prompt(
      "Reject Document",
      "Please enter the reason for rejection:",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive", 
          onPress: (reason) => updateStatusMutation.mutate({ docId, status: "REJECTED", rejectionReason: reason || "Document requirements not met." }) 
        }
      ]
    );
  };

  const handleViewPdf = (docId: string) => {
    const url = `${getApiUrl()}v1/documents/${docId}/download?token=${accessToken}`;
    Linking.openURL(url);
  };

  const pendingDocs = documents.filter(d => d.status === "ASSIGNED");

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={documents}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.tabContent, { paddingBottom: 100 }]}
        ListHeaderComponent={pendingDocs.length > 0 ? (
          <View style={[styles.warningBanner, { backgroundColor: T.warningBg, borderColor: T.warningBorder }]}>
            <Ionicons name="warning-outline" size={20} color={T.warningText} />
            <Text style={[styles.warningText, { color: T.warningText }]}>
              {pendingDocs.length} document(s) still pending upload.
            </Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: T.text, fontFamily: "Inter_600SemiBold" }]}>
                  {item.documentType?.name || "Unknown Document"}
                </Text>
                {item.documentType?.isRequired && (
                  <Text style={{ color: T.danger, fontSize: 10, fontFamily: "Inter_600SemiBold" }}>REQUIRED</Text>
                )}
              </View>
              <StatusPill status={item.status} small />
            </View>

            {item.rejectionReason && (
              <View style={[styles.rejectionInfo, { backgroundColor: T.dangerBg + "50" }]}>
                <Text style={[styles.rejectionLabel, { color: T.dangerText }]}>Rejection Reason:</Text>
                <Text style={[styles.rejectionText, { color: T.dangerText }]}>{item.rejectionReason}</Text>
              </View>
            )}
            
            <View style={styles.docActions}>
              {item.fileUrl && (
                <TouchableOpacity 
                  onPress={() => handleViewPdf(item.id)}
                  style={[styles.docBtn, { backgroundColor: T.primary + "10", flex: 1 }]}
                >
                  <Ionicons name="eye-outline" size={16} color={T.primary} />
                  <Text style={{ color: T.primary, fontSize: 12, fontFamily: "Inter_600SemiBold", marginLeft: 4 }}>View PDF</Text>
                </TouchableOpacity>
              )}
              
              {item.status === "UPLOADED" && (
                <View style={{ flexDirection: 'row', gap: 8, flex: 2 }}>
                  <TouchableOpacity 
                    onPress={() => updateStatusMutation.mutate({ docId: item.id, status: "APPROVED" })}
                    style={[styles.docBtn, { backgroundColor: T.successBg, flex: 1 }]}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={T.success} />
                    <Text style={{ color: T.success, fontSize: 12, fontFamily: "Inter_600SemiBold", marginLeft: 4 }}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleReject(item.id)}
                    style={[styles.docBtn, { backgroundColor: T.dangerBg, flex: 1 }]}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={T.danger} />
                    <Text style={{ color: T.danger, fontSize: 12, fontFamily: "Inter_600SemiBold", marginLeft: 4 }}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={<EmptyState title="No documents assigned" icon="document-text-outline" />}
      />
    </View>
  );
}

function TrackingTab({ patientId, currentStep, arrivalDate, departureDate, onUpdate }: any) {
  const mutation = useMutation({
    mutationFn: async (step: string) => {
      await apiRequest("PUT", `/v1/manager/patients/${patientId}/tracking`, { currentStep: step });
    },
    onSuccess: () => {
      onUpdate();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const getSuggestedStep = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arrival = arrivalDate ? new Date(arrivalDate) : null;
    const departure = departureDate ? new Date(departureDate) : null;

    if (!arrival || today < arrival) return "PRE_ARRIVAL";
    if (departure && today > departure) return "DEPARTURE";
    return "TREATMENT";
  };

  const suggestedStep = getSuggestedStep();

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Card style={{ marginBottom: 16 }}>
        <SectionHeader label="Patient Journey" />
        <View style={styles.stepperContainer}>
          {TRACKING_STEPS.map((step, index) => {
            const isCurrent = currentStep === step.key;
            const isSuggested = !currentStep && suggestedStep === step.key;
            
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={[
                    styles.stepIndicator, 
                    { 
                      backgroundColor: isCurrent ? T.success : T.surface,
                      borderColor: isCurrent ? T.success : T.border
                    }
                  ]}>
                    {isCurrent ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Ionicons name={step.icon} size={16} color={T.textMuted} />
                    )}
                  </View>
                  {index < TRACKING_STEPS.length - 1 && <View style={[styles.stepLine, { backgroundColor: T.border }]} />}
                </View>
                
                <View style={styles.stepContent}>
                  <View style={styles.stepHeader}>
                    <Text style={[
                      styles.stepLabel, 
                      { color: isCurrent ? T.text : T.textMuted, fontFamily: isCurrent ? "Inter_700Bold" : "Inter_500Medium" }
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: T.successBg }]}>
                        <Text style={[styles.currentBadgeText, { color: T.successText }]}>CURRENT</Text>
                      </View>
                    )}
                    {isSuggested && (
                      <View style={[styles.currentBadge, { backgroundColor: T.accent + "15" }]}>
                        <Text style={[styles.currentBadgeText, { color: T.accent }]}>SUGGESTED</Text>
                      </View>
                    )}
                  </View>
                  
                  {!isCurrent && (
                    <TouchableOpacity 
                      style={[styles.setStepBtn, { borderColor: T.border }]}
                      onPress={() => mutation.mutate(step.key)}
                      disabled={mutation.isPending}
                    >
                      <Text style={[styles.setStepBtnText, { color: T.text }]}>Set as current</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card>
      
      <Card style={{ marginBottom: 16 }}>
        <SectionHeader label="About Tracking" />
        <Text style={[styles.infoValue, { color: T.textSec, fontSize: 13, lineHeight: 18 }]}>
          Track the patient's progress through their medical journey. Updating the status helps other team members stay informed about where the patient is in their treatment plan.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  tabBarScroll: {
    marginBottom: 0,
  },
  tabBarContent: {
    paddingRight: 16,
  },
  tabBar: {
    flexDirection: "row",
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  notesContainer: {
    marginTop: 16,
  },
  modalRoot: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalBody: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  assignmentContainer: {
    paddingVertical: 8,
  },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  assignmentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  assignmentBody: {
    paddingLeft: 48,
  },
  assignmentName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  assignmentSub: {
    fontSize: 13,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  callBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  pickerItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pickerItemText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  cardMetaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  fab: {
    position: "absolute",
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  warningText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  rejectionInfo: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  rejectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 12,
  },
  docActions: {
    flexDirection: 'row',
    gap: 12,
  },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  stepperContainer: {
    marginTop: 8,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 80,
  },
  stepLeft: {
    alignItems: 'center',
    width: 32,
    marginRight: 16,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepLine: {
    flex: 1,
    width: 2,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 24,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepLabel: {
    fontSize: 15,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  setStepBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  setStepBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
