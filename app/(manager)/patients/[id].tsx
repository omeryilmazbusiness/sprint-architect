import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  Animated,
  Dimensions,
  Linking,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { T, cardShadow, softShadow } from "@/constants/adminTheme";
import { StatusPill, Card, SectionHeader, ListRow, PrimaryButton, TextField, SecondaryButton } from "@/components/ui";
import { LoadingView } from "@/components/LoadingView";
import { ErrorView } from "@/components/ErrorView";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Patient {
  id: string;
  fullName: string;
  patientKey: string;
  phone?: string;
  email?: string;
  nationality?: string;
  arrivalDate?: string;
  departureDate?: string;
  status: string;
  notes?: string;
}

interface Appointment {
  id: string;
  title: string;
  startAt: string;
  status: string;
  doctor?: { fullName: string };
}

interface Document {
  id: string;
  status: "ASSIGNED" | "UPLOADED" | "APPROVED" | "REJECTED";
  fileUrl?: string;
  documentType?: { id: string; name: string; code: string; isRequired: boolean };
}

interface RequiredDoc {
  code: string;
  name: string;
  status: string | null;
  fileUrl?: string | null;
  documentId?: string | null;
}

interface AggregateData {
  patient: Patient;
  plan: any;
  doctor: { id: string; fullName: string; specialty?: string } | null;
  hotel: { id: string; name: string } | null;
  transport: { id: string; name: string } | null;
  documents: Document[];
  requiredDocuments?: RequiredDoc[];
  appointments: Appointment[];
  nextAppointment: Appointment | null;
  tracking: { currentStep: string | null };
}

const STEP_LABELS: Record<string, string> = {
  PRE_ARRIVAL: "Pre-Arrival",
  ARRIVAL_TRANSFER: "Arrival & Transfer",
  HOTEL_CHECKIN: "Hotel Check-in",
  TREATMENT: "Treatment",
  FOLLOWUP: "Follow-up",
  DEPARTURE: "Departure",
};

const TRACKING_STEPS = [
  { key: "PRE_ARRIVAL", icon: "airplane-outline" as const },
  { key: "ARRIVAL_TRANSFER", icon: "car-outline" as const },
  { key: "HOTEL_CHECKIN", icon: "business-outline" as const },
  { key: "TREATMENT", icon: "medical-outline" as const },
  { key: "FOLLOWUP", icon: "calendar-outline" as const },
  { key: "DEPARTURE", icon: "airplane" as const },
];

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Sheet visibility states
  const [assignDocsVisible, setAssignDocsVisible] = useState(false);
  const [newApptVisible, setNewApptVisible] = useState(false);
  const [changeDoctorVisible, setChangeDoctorVisible] = useState(false);
  const [changeHotelVisible, setChangeHotelVisible] = useState(false);
  const [editPatientVisible, setEditPatientVisible] = useState(false);

  const queryKey = [`/v1/manager/patients/${id}/details`];
  const { data, isLoading, error, refetch } = useQuery<AggregateData>({
    queryKey,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) return <LoadingView />;
  if (error || !data) return <ErrorView message="Failed to load patient details" onRetry={refetch} />;

  const { patient, doctor, hotel, transport, requiredDocuments, appointments, nextAppointment, tracking } = data;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const formatDateRange = (start?: string, end?: string) => {
    if (!start && !end) return "Dates not set";
    const s = start ? new Date(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : "?";
    const e = end ? new Date(end).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : "?";
    return `${s} → ${e}`;
  };

  const currentStepLabel = tracking?.currentStep ? STEP_LABELS[tracking.currentStep] : null;

  const handleViewDoc = async (docId: string) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const apiBase = getApiUrl();
      const res = await fetch(new URL(`/v1/documents/${docId}/signed-url`, apiBase).href, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Cannot get signed URL");
      const { url } = await res.json();
      const fullUrl = new URL(url, apiBase).href;
      await WebBrowser.openBrowserAsync(fullUrl);
    } catch {
      Alert.alert("Error", "Cannot open document");
    }
  };

  const handleDownloadDoc = async (docId: string) => {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      const apiBase = getApiUrl();
      const downloadRes = await fetch(new URL(`/v1/documents/${docId}/signed-url`, apiBase).href, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!downloadRes.ok) throw new Error("Cannot get signed URL");
      const { url } = await downloadRes.json();
      const fullUrl = new URL(url, apiBase).href;

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = `document_${docId}.pdf`;
        link.click();
      } else {
        await WebBrowser.openBrowserAsync(fullUrl);
      }
    } catch {
      Alert.alert("Error", "Cannot download document");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Sticky Hero Header */}
      <View style={[styles.heroHeader, { paddingTop: topPad + 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={T.text} />
          </Pressable>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.patientName}>{patient.fullName}</Text>
              <StatusPill status={patient.status} small />
            </View>
            <Text style={styles.dateRange}>{formatDateRange(patient.arrivalDate, patient.departureDate)}</Text>
          </View>
          <Pressable onPress={() => setEditPatientVisible(true)} style={styles.editBtn}>
            <Feather name="edit-3" size={20} color={T.primary} />
          </Pressable>
        </View>

        {currentStepLabel && (
          <View style={styles.trackingPillContainer}>
            <View style={[styles.trackingPill, { backgroundColor: T.primary + "10" }]}>
              <Ionicons name="location" size={14} color={T.primary} />
              <Text style={styles.trackingPillText}>{currentStepLabel}</Text>
            </View>
          </View>
        )}

        <View style={styles.quickActions}>
          <QuickAction 
            icon="document-attach-outline" 
            label="Assign Docs" 
            onPress={() => setAssignDocsVisible(true)} 
          />
          <QuickAction 
            icon="calendar-outline" 
            label="New Appt" 
            onPress={() => setNewApptVisible(true)} 
          />
          <QuickAction 
            icon="person-outline" 
            label="Doctor" 
            onPress={() => setChangeDoctorVisible(true)} 
          />
          <QuickAction 
            icon="business-outline" 
            label="Hotel" 
            onPress={() => setChangeHotelVisible(true)} 
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      >
        {/* Overview Card */}
        <Card style={styles.sectionCard}>
          <SectionHeader label="Overview" />
          
          <OverviewRow 
            icon="person-outline" 
            label="Doctor" 
            value={doctor?.fullName ?? "Not assigned"} 
            onPress={() => setChangeDoctorVisible(true)}
            showAction
          />
          <OverviewRow 
            icon="business-outline" 
            label="Hotel" 
            value={hotel?.name ?? "Not assigned"} 
            onPress={() => setChangeHotelVisible(true)}
            showAction
          />
          <OverviewRow 
            icon="car-outline" 
            label="Transport" 
            value={transport?.name ?? "Not assigned"} 
          />

          <View style={styles.divider} />
          
          <Text style={styles.subHeader}>REQUIRED DOCUMENTS</Text>
          {(requiredDocuments ?? [
            { code: "PASSPORT_COPY", name: "Passport Photocopy", status: null },
            { code: "VISA", name: "Visa", status: null }
          ]).map((doc) => (
            <DocStatusRow key={doc.code} doc={doc} onView={() => doc.documentId && handleViewDoc(doc.documentId)} onDownload={() => doc.documentId && handleDownloadDoc(doc.documentId)} />
          ))}

          <View style={styles.divider} />

          <Text style={styles.subHeader}>NEXT APPOINTMENT</Text>
          {nextAppointment ? (
            <View style={styles.nextApptContainer}>
              <Text style={styles.nextApptTime}>
                {new Date(nextAppointment.startAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
              </Text>
              <Text style={styles.nextApptTitle}>{nextAppointment.title}</Text>
              {nextAppointment.doctor && (
                <Text style={styles.nextApptDoctor}>with {nextAppointment.doctor.fullName}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No upcoming appointments</Text>
          )}
        </Card>

        {/* Tracking Card */}
        <Card style={styles.sectionCard}>
          <SectionHeader label="Tracking" />
          <View style={styles.stepperContainer}>
            {TRACKING_STEPS.map((step, index) => (
              <TrackingStep 
                key={step.key}
                step={step}
                isLast={index === TRACKING_STEPS.length - 1}
                currentStep={tracking?.currentStep}
                onPress={() => {
                  apiRequest("PUT", `/v1/manager/patients/${id}/tracking`, { currentStep: step.key })
                    .then(() => qc.invalidateQueries({ queryKey }));
                }}
              />
            ))}
          </View>
        </Card>

        {/* Appointments Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <SectionHeader label="Upcoming Appointments" />
            <Pressable onPress={() => setNewApptVisible(true)}>
              <Ionicons name="add-circle-outline" size={24} color={T.primary} />
            </Pressable>
          </View>
          
          {appointments.length > 0 ? (
            appointments.slice(0, 5).map((appt, i) => (
              <View key={appt.id} style={[styles.apptRow, i === 0 && { borderTopWidth: 0 }]}>
                <View style={styles.apptDateCol}>
                  <Text style={styles.apptDay}>{new Date(appt.startAt).getDate()}</Text>
                  <Text style={styles.apptMonth}>{new Date(appt.startAt).toLocaleString('default', { month: 'short' })}</Text>
                </View>
                <View style={styles.apptInfoCol}>
                  <Text style={styles.apptTime}>{new Date(appt.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.apptTitle} numberOfLines={1}>{appt.title}</Text>
                </View>
                <StatusPill status={appt.status} small />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No appointments scheduled</Text>
          )}

          {appointments.length > 5 && (
            <TouchableOpacity style={styles.viewMoreBtn}>
              <Text style={styles.viewMoreText}>View all appointments</Text>
            </TouchableOpacity>
          )}
        </Card>
      </ScrollView>

      {/* Bottom Sheets */}
      <AssignDocumentsSheet 
        visible={assignDocsVisible} 
        onClose={() => setAssignDocsVisible(false)} 
        patientId={id}
        onSuccess={() => qc.invalidateQueries({ queryKey })}
      />
      <CreateAppointmentSheet 
        visible={newApptVisible} 
        onClose={() => setNewApptVisible(false)} 
        patientId={id}
        onSuccess={() => qc.invalidateQueries({ queryKey })}
      />
      <ChangeDoctorSheet 
        visible={changeDoctorVisible} 
        onClose={() => setChangeDoctorVisible(false)} 
        patientId={id}
        currentDoctorId={doctor?.id}
        onSuccess={() => qc.invalidateQueries({ queryKey })}
      />
      <EditPatientSheet
        visible={editPatientVisible}
        onClose={() => setEditPatientVisible(false)}
        patient={patient}
        onSuccess={() => qc.invalidateQueries({ queryKey })}
      />
      <ChangeHotelSheet
        visible={changeHotelVisible}
        onClose={() => setChangeHotelVisible(false)}
        patientId={id}
        currentHotelId={hotel?.id}
        onSuccess={() => qc.invalidateQueries({ queryKey })}
      />

    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuickAction({ icon, label, onPress }: { icon: any, label: string, onPress: () => void }) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.qaIconWrap, { backgroundColor: T.primary + "08" }]}>
        <Ionicons name={icon} size={20} color={T.primary} />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </Pressable>
  );
}

function OverviewRow({ icon, label, value, onPress, showAction }: any) {
  return (
    <View style={styles.overviewRow}>
      <Ionicons name={icon} size={18} color={T.textMuted} style={styles.rowIcon} />
      <View style={styles.rowMain}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {showAction && (
        <Pressable onPress={onPress}>
          <Text style={styles.rowActionText}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

function DocStatusRow({ doc, onView, onDownload }: { doc: RequiredDoc; onView?: () => void; onDownload?: () => void }) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "APPROVED": return T.success;
      case "UPLOADED": return T.accent;
      case "ASSIGNED": return T.warning;
      case "REJECTED": return T.danger;
      default: return T.textMuted;
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return "Not assigned";
    return status.charAt(0) + status.slice(1).toLowerCase();
  };

  const color = getStatusColor(doc.status);

  return (
    <View style={styles.docContainer}>
      <View style={styles.docRow}>
        <Ionicons name="document-text-outline" size={18} color={T.textMuted} />
        <Text style={styles.docName}>{doc.name}</Text>
        <View style={[styles.docStatusBadge, { backgroundColor: color + "10" }]}>
          <Text style={[styles.docStatusText, { color }]}>{getStatusLabel(doc.status)}</Text>
        </View>
      </View>
      {(doc.status === "UPLOADED" || doc.status === "APPROVED") && doc.documentId && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4, marginLeft: 26 }}>
          <Pressable onPress={onView} style={styles.viewBtnStyle}>
            <Ionicons name="eye-outline" size={14} color={T.primary} />
            <Text style={{ color: T.primary, fontSize: 12, marginLeft: 4 }}>View</Text>
          </Pressable>
          <Pressable onPress={onDownload} style={styles.viewBtnStyle}>
            <Ionicons name="download-outline" size={14} color={T.textMuted} />
            <Text style={{ color: T.textMuted, fontSize: 12, marginLeft: 4 }}>Download</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function TrackingStep({ step, isLast, currentStep, onPress }: any) {
  const isCompleted = TRACKING_STEPS.findIndex(s => s.key === currentStep) > TRACKING_STEPS.findIndex(s => s.key === step.key);
  const isCurrent = currentStep === step.key;
  const label = STEP_LABELS[step.key];

  let circleColor: string = T.border;
  let textColor: string = T.textMuted;
  let iconColor: string = T.textMuted;

  if (isCurrent) {
    circleColor = T.success;
    textColor = T.success;
    iconColor = T.success;
  } else if (isCompleted) {
    circleColor = T.textMuted;
    textColor = T.text;
    iconColor = T.textMuted;
  }

  return (
    <View style={styles.stepRow}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepCircle, { borderColor: circleColor, backgroundColor: isCurrent || isCompleted ? circleColor : "transparent" }]}>
          {isCompleted ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : (
            <Ionicons name={step.icon} size={14} color={isCurrent ? "#fff" : iconColor} />
          )}
        </View>
        {!isLast && <View style={[styles.stepLine, { backgroundColor: isCompleted ? T.textMuted : T.border }]} />}
      </View>
      <View style={styles.stepRight}>
        <Text style={[styles.stepLabel, { color: textColor, fontWeight: isCurrent ? "700" : "500" }]}>{label}</Text>
        {!isCurrent && (
          <Pressable onPress={onPress} style={styles.stepAction}>
            <Text style={styles.stepActionText}>Set as current</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Sheets ──────────────────────────────────────────────────────────────────

function BottomSheet({ visible, onClose, title, children }: { visible: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[
          styles.sheetContainer, 
          { 
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 20
          }
        ]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
              <Ionicons name="close" size={24} color={T.text} />
            </Pressable>
          </View>
          <View style={styles.sheetContent}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function AssignDocumentsSheet({ visible, onClose, patientId, onSuccess }: any) {
  const [selectedDocItems, setSelectedDocItems] = useState<{docTypeId: string; instruction: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: docTypes } = useQuery<any[]>({
    queryKey: ["/v1/manager/document-types"],
    enabled: visible,
  });

  const toggleDocType = (dtId: string) => {
    setSelectedDocItems(prev => 
      prev.some(x => x.docTypeId === dtId) 
        ? prev.filter(x => x.docTypeId !== dtId)
        : [...prev, { docTypeId: dtId, instruction: "" }]
    );
  };

  const updateInstruction = (dtId: string, text: string) => {
    setSelectedDocItems(prev => prev.map(x => x.docTypeId === dtId ? { ...x, instruction: text } : x));
  };

  const handleAssign = async () => {
    if (selectedDocItems.length === 0) return;
    setLoading(true);
    try {
      const payload = {
        items: selectedDocItems.map(x => ({
          documentTypeId: x.docTypeId,
          instructionText: x.instruction || undefined,
        })),
      };
      await apiRequest("POST", `/v1/manager/patients/${patientId}/assign-documents`, payload);
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Assign Documents">
      <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
        {docTypes?.map((dt) => {
          const isSelected = selectedDocItems.some(x => x.docTypeId === dt.id);
          const item = selectedDocItems.find(x => x.docTypeId === dt.id);
          return (
            <View key={dt.id} style={styles.assignDocItem}>
              <Pressable style={styles.checkRow} onPress={() => toggleDocType(dt.id)}>
                <Text style={styles.checkLabel}>{dt.name}</Text>
                <Ionicons 
                  name={isSelected ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={isSelected ? T.primary : T.textMuted} 
                />
              </Pressable>
              {isSelected && (
                <TextField
                  placeholder="Instruction (optional)"
                  value={item?.instruction}
                  onChangeText={(text) => updateInstruction(dt.id, text)}
                  style={styles.instructionInput}
                />
              )}
            </View>
          );
        })}
        
        <PrimaryButton 
          label="Assign Selected Documents" 
          onPress={handleAssign} 
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </BottomSheet>
  );
}

function DocCheckRow({ label, selected, onPress }: any) {
  return (
    <Pressable style={styles.checkRow} onPress={onPress}>
      <Text style={styles.checkLabel}>{label}</Text>
      <Ionicons 
        name={selected ? "checkbox" : "square-outline"} 
        size={24} 
        color={selected ? T.primary : T.textMuted} 
      />
    </Pressable>
  );
}

function CreateAppointmentSheet({ visible, onClose, patientId, onSuccess }: any) {
  const [form, setForm] = useState({ title: "", startAt: "", notes: "", doctorId: "" });
  const [apptError, setApptError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: doctorsData } = useQuery<{ rows: any[] }>({
    queryKey: ["/v1/manager/doctors"],
    enabled: visible,
  });

  const handleCreate = async () => {
    setApptError("");
    if (!form.title || !form.startAt) {
      Alert.alert("Missing Information", "Please provide a title and date.");
      return;
    }
    if (!form.doctorId) {
      setApptError("Please select a doctor");
      return;
    }

    setLoading(true);
    try {
      let isoDate = "";
      try {
        isoDate = new Date(form.startAt).toISOString();
      } catch (e) {
        Alert.alert("Invalid Date", "Please use YYYY-MM-DDTHH:MM format");
        setLoading(false);
        return;
      }

      await apiRequest("POST", `/v1/manager/patients/${patientId}/appointments`, {
        ...form,
        startAt: isoDate,
        type: "Consultation" // default type
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="New Appointment">
      <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
        <TextField 
          label="Title" 
          placeholder="e.g. Initial Consultation" 
          value={form.title} 
          onChangeText={v => setForm(f => ({...f, title: v}))}
        />
        <View style={{ height: 16 }} />
        <TextField 
          label="Date & Time" 
          placeholder="2026-03-20T10:00" 
          value={form.startAt} 
          onChangeText={v => setForm(f => ({...f, startAt: v}))}
        />
        <View style={{ height: 16 }} />
        <Text style={styles.fieldLabel}>DOCTOR</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.doctorPicker}>
          {doctorsData?.rows.map(doc => (
            <Pressable 
              key={doc.id}
              style={[styles.docChip, form.doctorId === doc.id && { borderColor: T.primary, backgroundColor: T.primary + "08" }]}
              onPress={() => {
                setForm(f => ({...f, doctorId: doc.id}));
                setApptError("");
              }}
            >
              <Text style={[styles.docChipText, form.doctorId === doc.id && { color: T.primary }]}>{doc.fullName}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {apptError ? <Text style={styles.errorText}>{apptError}</Text> : null}
        <View style={{ height: 16 }} />
        <TextField 
          label="Notes" 
          placeholder="Additional details..." 
          multiline 
          style={{ height: 80 }}
          value={form.notes} 
          onChangeText={v => setForm(f => ({...f, notes: v}))}
        />
        
        <PrimaryButton 
          label="Create Appointment" 
          onPress={handleCreate} 
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </BottomSheet>
  );
}

function ChangeDoctorSheet({ visible, onClose, patientId, currentDoctorId, onSuccess }: any) {
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ rows: any[] }>({
    queryKey: ["/v1/manager/doctors"],
    enabled: visible,
  });

  const handleSelect = async (doctorId: string) => {
    setLoadingId(doctorId);
    try {
      await apiRequest("PUT", `/v1/manager/patients/${patientId}/assign-doctor`, { doctorId });
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = data?.rows.filter(d => d.fullName.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Change Doctor">
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={T.textMuted} />
        <TextInput 
          placeholder="Search doctors..." 
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          style={{ maxHeight: 400 }}
          renderItem={({ item }) => (
            <Pressable style={styles.doctorRow} onPress={() => handleSelect(item.id)}>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{item.fullName}</Text>
                <Text style={styles.doctorSpecialty}>{item.specialty || "General Practitioner"}</Text>
              </View>
              {loadingId === item.id ? (
                <ActivityIndicator size="small" color={T.primary} />
              ) : currentDoctorId === item.id ? (
                <Ionicons name="checkmark-circle" size={24} color={T.success} />
              ) : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No doctors found</Text>}
        />
      )}
    </BottomSheet>
  );
}

function EditPatientSheet({ visible, onClose, patient, onSuccess }: any) {
  const [form, setForm] = useState(patient);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiRequest("PUT", `/v1/manager/patients/${patient.id}`, form);
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit Patient Info">
      <ScrollView style={styles.sheetScroll}>
        <TextField label="Full Name" value={form.fullName} onChangeText={v => setForm((f: any) => ({...f, fullName: v}))} />
        <View style={{ height: 16 }} />
        <TextField label="Phone" value={form.phone || ""} onChangeText={v => setForm((f: any) => ({...f, phone: v}))} keyboardType="phone-pad" />
        <View style={{ height: 16 }} />
        <TextField label="Email" value={form.email || ""} onChangeText={v => setForm((f: any) => ({...f, email: v}))} keyboardType="email-address" autoCapitalize="none" />
        <View style={{ height: 16 }} />
        <TextField label="Nationality" value={form.nationality || ""} onChangeText={v => setForm((f: any) => ({...f, nationality: v}))} />
        <View style={{ height: 16 }} />
        <TextField label="Arrival Date (YYYY-MM-DD)" value={form.arrivalDate || ""} onChangeText={v => setForm((f: any) => ({...f, arrivalDate: v}))} />
        <View style={{ height: 16 }} />
        <TextField label="Departure Date (YYYY-MM-DD)" value={form.departureDate || ""} onChangeText={v => setForm((f: any) => ({...f, departureDate: v}))} />
        
        <PrimaryButton 
          label="Save Changes" 
          onPress={handleSave} 
          loading={loading}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </BottomSheet>
  );
}

function ChangeHotelSheet({ visible, onClose, patientId, currentHotelId, onSuccess }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(currentHotelId ?? null);
  const [stayDays, setStayDays] = useState("");
  const [roomNo, setRoomNo] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<{ rows: any[] }>({
    queryKey: ["/v1/manager/hotels"],
    enabled: visible,
  });

  const handleSave = async () => {
    if (!selectedId) { Alert.alert("Select a hotel first"); return; }
    setSaving(true);
    try {
      await apiRequest("PUT", `/v1/manager/patients/${patientId}/assign-hotel`, {
        hotelId: selectedId,
        stayDays: stayDays ? parseInt(stayDays) : undefined,
        roomNo: roomNo || undefined,
        checkInDate: checkIn || undefined,
        checkOutDate: checkOut || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Change Hotel">
      {isLoading ? (
        <ActivityIndicator style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={data?.rows ?? []}
          keyExtractor={item => item.id}
          style={{ maxHeight: 300 }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.hotelRow, selectedId === item.id && styles.selectedHotelRow]}
              onPress={() => setSelectedId(item.id)}
            >
              <Text style={styles.hotelRowText}>{item.name}</Text>
              {selectedId === item.id && (
                <Ionicons name="checkmark-circle" size={22} color={T.primary} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[styles.hotelRowText, { padding: 16, color: T.textMuted }]}>No hotels found</Text>}
        />
      )}
      <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: T.border }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            style={[styles.sheetInput, { flex: 1 }]}
            placeholder="Stay Days"
            placeholderTextColor={T.textMuted}
            keyboardType="numeric"
            value={stayDays}
            onChangeText={setStayDays}
          />
          <TextInput
            style={[styles.sheetInput, { flex: 1 }]}
            placeholder="Room No"
            placeholderTextColor={T.textMuted}
            value={roomNo}
            onChangeText={setRoomNo}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            style={[styles.sheetInput, { flex: 1 }]}
            placeholder="Check-in (YYYY-MM-DD)"
            placeholderTextColor={T.textMuted}
            value={checkIn}
            onChangeText={setCheckIn}
          />
          <TextInput
            style={[styles.sheetInput, { flex: 1 }]}
            placeholder="Check-out (YYYY-MM-DD)"
            placeholderTextColor={T.textMuted}
            value={checkOut}
            onChangeText={setCheckOut}
          />
        </View>
        <Pressable
          style={[styles.sheetBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sheetBtnText}>Assign Hotel</Text>}
        </Pressable>
      </View>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  patientName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: T.text,
  },
  dateRange: {
    fontSize: 13,
    color: T.textMuted,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  editBtn: {
    padding: 8,
  },
  trackingPillContainer: {
    marginTop: 12,
    flexDirection: "row",
  },
  trackingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  trackingPillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: T.primary,
  },
  quickActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  quickAction: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  qaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  qaLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: T.text,
  },
  scrollContent: {
    padding: 16,
  },
  sectionCard: {
    marginBottom: 16,
  },
  overviewRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowIcon: {
    width: 24,
    textAlign: "center",
    marginRight: 12,
  },
  rowMain: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 11,
    color: T.textMuted,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  rowValue: {
    fontSize: 15,
    color: T.text,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  rowActionText: {
    fontSize: 13,
    color: T.primary,
    fontFamily: "Inter_600SemiBold",
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 16,
  },
  subHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: T.textMuted,
    marginBottom: 12,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 12,
  },
  docName: {
    flex: 1,
    fontSize: 14,
    color: T.text,
    fontFamily: "Inter_500Medium",
  },
  docStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  docStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  nextApptContainer: {
    backgroundColor: T.surfaceSubtle,
    padding: 12,
    borderRadius: 10,
  },
  nextApptTime: {
    fontSize: 12,
    color: T.accent,
    fontFamily: "Inter_600SemiBold",
  },
  nextApptTitle: {
    fontSize: 16,
    color: T.text,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  nextApptDoctor: {
    fontSize: 13,
    color: T.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: T.textMuted,
    fontSize: 14,
    marginVertical: 12,
  },
  stepperContainer: {
    paddingTop: 8,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 60,
  },
  stepLeft: {
    alignItems: "center",
    width: 30,
    marginRight: 16,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepRight: {
    flex: 1,
    paddingBottom: 20,
  },
  stepLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  stepAction: {
    marginTop: 4,
  },
  stepActionText: {
    fontSize: 12,
    color: T.primary,
    fontFamily: "Inter_600SemiBold",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  apptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  apptDateCol: {
    width: 45,
    alignItems: "center",
  },
  apptDay: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: T.text,
  },
  apptMonth: {
    fontSize: 11,
    color: T.textMuted,
    textTransform: "uppercase",
    fontFamily: "Inter_600SemiBold",
  },
  apptInfoCol: {
    flex: 1,
    paddingHorizontal: 12,
  },
  apptTime: {
    fontSize: 12,
    color: T.textMuted,
    fontFamily: "Inter_500Medium",
  },
  apptTitle: {
    fontSize: 15,
    color: T.text,
    fontFamily: "Inter_600SemiBold",
    marginTop: 1,
  },
  viewMoreBtn: {
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  viewMoreText: {
    fontSize: 13,
    color: T.primary,
    fontFamily: "Inter_600SemiBold",
  },

  // Sheet Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: T.text,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetContent: {
    padding: 20,
  },
  sheetBody: {
    gap: 12,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  checkLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: T.text,
  },
  sheetScroll: {
    maxHeight: 500,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: T.textMuted,
    marginBottom: 8,
  },
  doctorPicker: {
    flexDirection: "row",
  },
  docChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    marginRight: 8,
    backgroundColor: T.surface,
  },
  docChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: T.text,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    color: T.text,
    fontFamily: "Inter_600SemiBold",
  },
  doctorSpecialty: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  errorText: {
    color: T.danger,
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
  },
  assignDocItem: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingBottom: 8,
  },
  instructionInput: {
    marginTop: 8,
    height: 40,
  },
  docContainer: {
    marginBottom: 12,
  },
  viewBtnStyle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: T.bg,
  },
  hotelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  selectedHotelRow: {
    backgroundColor: T.primary + "08",
    borderColor: T.primary,
  },
  hotelRowText: {
    fontSize: 15,
    color: T.text,
    fontFamily: "Inter_500Medium",
  },
  sheetInput: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.r8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: T.text,
    fontFamily: "Inter_400Regular",
  },
  sheetBtn: {
    height: 46,
    borderRadius: T.r12,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnText: {
    fontSize: 15,
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
});
