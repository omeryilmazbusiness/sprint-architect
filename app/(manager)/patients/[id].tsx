import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
  Alert,
  ToastAndroid,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { openPdf } from "@/services/files/FileService";
import { T, cardShadow } from "@/constants/adminTheme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";
import { GuestHeroCard } from "@/components/guestDetail/GuestHeroCard";
import { GuestInfoCard } from "@/components/guestDetail/GuestInfoCard";
import { GuestTrackingStepper } from "@/components/guestDetail/GuestTrackingStepper";
import { TransportAssignmentCard } from "@/components/guestDetail/TransportAssignmentCard";
import { HotelAssignmentCard } from "@/components/guestDetail/HotelAssignmentCard";
import { DocumentsAssignmentCard } from "@/components/guestDetail/DocumentsAssignmentCard";
import { AssignTransportSheet } from "@/components/guestDetail/AssignTransportSheet";
import { AssignHotelSheet } from "@/components/guestDetail/AssignHotelSheet";
import { AssignDocTypeSheet } from "@/components/guestDetail/AssignDocTypeSheet";
import { CreateAppointmentSheet } from "@/components/guestDetail/CreateAppointmentSheet";
import { useT } from "@/hooks/useT";
import { DISPLAY_TERMS } from "@/constants/terminology";
import { useLanguage } from "@/context/LanguageContext";

const LOCALE_BCP47: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  tr: "tr-TR",
  es: "es-ES",
};

interface GuestDetail {
  patient: {
    id: string;
    clinicId: string;
    fullName: string;
    status: string;
    patientKey: string;
    phoneE164: string | null;
    email: string | null;
    nationality: string | null;
    nationalityCode: string | null;
    passportNo: string | null;
    dateOfBirth: string | null;
    arrivalDate: string | null;
    departureDate: string | null;
    notes: string | null;
    requestedServices: string[];
    companionRelation: string | null;
    emergencyContactName: string | null;
    emergencyContactPhoneE164: string | null;
  };
  tracking: { currentStep: string | null };
  assignments: {
    transport: {
      id: string;
      vehicleBrand: string | null;
      vehicleModel: string | null;
      licensePlate: string | null;
      driverFullName: string | null;
      driverPhoneE164: string | null;
    } | null;
    hotel: {
      id: string;
      name: string;
      address: string | null;
      phone: string | null;
      website: string | null;
    } | null;
  };
  documents: {
    assigned: Array<{
      id: string;
      typeId: string;
      typeName: string;
      instructionText: string | null;
      status: string;
      fileUrl: string | null;
      fileName: string | null;
      fileSize: number | null;
      uploadedAt: string | null;
    }>;
    summary: { pending: number; uploaded: number };
  };
  nextAppointment: {
    id: string;
    title: string | null;
    startAt: string;
    doctor: { fullName: string } | null;
  } | null;
}

function showToast(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else if (Platform.OS !== "web") {
    Alert.alert("", msg, [{ text: "OK" }], { cancelable: true });
  }
}

function fmtDateTime(iso: string, bcp47 = "en-US") {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(bcp47, {
      month: "short",
      day: "numeric",
    }) + " · " + d.toLocaleTimeString(bcp47, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function GuestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const t = useT();
  const tp = t.managerPatient;
  const { locale } = useLanguage();
  const bcp47 = LOCALE_BCP47[locale] ?? "en-US";

  const [showTransportSheet, setShowTransportSheet] = useState(false);
  const [showHotelSheet, setShowHotelSheet] = useState(false);
  const [showDocSheet, setShowDocSheet] = useState(false);
  const [showApptSheet, setShowApptSheet] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [cancellingApptId, setCancellingApptId] = useState<string | null>(null);

  const detailKey = [`/v1/manager/patients/${id}/details`];

  const { data, isLoading, isError, refetch } = useQuery<GuestDetail>({
    queryKey: detailKey,
    enabled: !!id,
    retry: 1,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: detailKey });

  const approveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/v1/manager/patients/${id}/approve`, {}),
    onSuccess: () => {
      invalidate();
      showToast(tp.toastApproved);
    },
    onError: () => showToast(tp.toastApprovalFailed),
  });

  const resetDeviceMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/v1/manager/patients/${id}/reset-device-binding`, {}),
    onSuccess: () => {
      setShowResetConfirm(false);
      showToast(tp.toastResetDevice);
    },
    onError: () => {
      setShowResetConfirm(false);
      showToast(tp.toastResetDeviceFailed);
    },
  });

  const trackingMutation = useMutation({
    mutationFn: (step: string) =>
      apiRequest("PUT", `/v1/manager/patients/${id}/tracking`, {
        currentStep: step,
      }),
    onSuccess: () => {
      invalidate();
    },
    onError: () => showToast(tp.toastStepFailed),
  });

  const assignTransportMutation = useMutation({
    mutationFn: (transportId: string) =>
      apiRequest("PUT", `/v1/manager/patients/${id}/assign-transport`, {
        transportId,
      }),
    onSuccess: () => {
      setShowTransportSheet(false);
      invalidate();
      showToast(tp.toastTransportAssigned);
    },
    onError: () => showToast(tp.toastTransportFailed),
  });

  const assignHotelMutation = useMutation({
    mutationFn: (hotelId: string) =>
      apiRequest("PUT", `/v1/manager/patients/${id}/assign-hotel`, {
        hotelId,
      }),
    onSuccess: () => {
      setShowHotelSheet(false);
      invalidate();
      showToast(tp.toastHotelAssigned);
    },
    onError: () => showToast(tp.toastHotelFailed),
  });

  const assignDocMutation = useMutation({
    mutationFn: ({
      typeId,
      instructionText,
    }: {
      typeId: string;
      instructionText: string;
    }) =>
      apiRequest("POST", `/v1/manager/patients/${id}/assign-documents`, {
        items: [
          {
            documentTypeId: typeId,
            ...(instructionText.trim()
              ? { instructionText: instructionText.trim() }
              : {}),
          },
        ],
      }),
    onSuccess: () => {
      setShowDocSheet(false);
      invalidate();
      showToast(tp.toastDocAssigned);
    },
    onError: (err: Error) =>
      showToast(err.message?.trim() || tp.toastDocAssignFailed),
  });

  const updateDocStatusMutation = useMutation({
    mutationFn: async ({
      docId,
      status,
      rejectionReason,
    }: {
      docId: string;
      status: "APPROVED" | "REJECTED";
      rejectionReason?: string;
    }) => {
      const res = await apiRequest("PUT", `/v1/manager/documents/${docId}`, {
        status,
        rejectionReason: rejectionReason ?? null,
      });
      if (!res.ok) throw new Error("Failed to update document status");
    },
    onSuccess: () => {
      invalidate();
      showToast(tp.toastDocStatusUpdated);
    },
    onError: () => showToast(tp.toastDocStatusFailed),
  });

  const cancelAppointmentMutation = useMutation({
    mutationFn: (apptId: string) => {
      setCancellingApptId(apptId);
      return apiRequest("DELETE", `/v1/manager/appointments/${apptId}`);
    },
    onSuccess: () => {
      setCancellingApptId(null);
      invalidate();
      showToast(tp.toastApptCancelled);
    },
    onError: () => {
      setCancellingApptId(null);
      showToast(tp.toastApptCancelFailed);
    },
  });

  function handleCancelAppointment(apptId: string, title: string) {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Cancel "${title || DISPLAY_TERMS.appointment.toLowerCase()}"?`)) {
        cancelAppointmentMutation.mutate(apptId);
      }
    } else {
      Alert.alert(
        tp.cancelApptTitle,
        tp.cancelApptConfirm,
        [
          { text: tp.cancelApptKeep, style: "cancel" },
          {
            text: tp.cancelApptAction,
            style: "destructive",
            onPress: () => cancelAppointmentMutation.mutate(apptId),
          },
        ]
      );
    }
  }

  const handleViewPdf = async (docId: string, fileName?: string | null) => {
    try {
      if (Platform.OS !== "web") showToast(tp.toastPreparingDoc);
      const baseUrl = getApiUrl();
      const resp = await fetch(`${baseUrl}v1/documents/${docId}/signed-url`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { message?: string };
        throw new Error(err.message ?? `Server error ${resp.status}`);
      }
      const body = (await resp.json()) as { url: string; fileName?: string };
      const resolvedFileName = fileName ?? body.fileName ?? "document.pdf";
      const fullUrl = body.url.startsWith("http")
        ? body.url
        : `${baseUrl.replace(/\/$/, "")}${body.url}`;
      await openPdf(fullUrl, resolvedFileName);
    } catch (e: any) {
      Alert.alert(tp.toastPdfError, e.message ?? "An unexpected error occurred");
    }
  };

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.centerBox, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={styles.loadingText}>{tp.loading}</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.centerBox, { paddingTop: topPad }]}>
        <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
        <Text style={styles.errorTitle}>{tp.errorTitle}</Text>
        <Text style={styles.errorSub}>{tp.errorSub}</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>{tp.tryAgain}</Text>
        </Pressable>
      </View>
    );
  }

  const { patient, tracking, assignments, documents, nextAppointment } = data;

  function handleApprove() {
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(`Approve ${patient.fullName}?`)
      ) {
        approveMutation.mutate();
      }
    } else {
      Alert.alert(
        tp.approveGuestTitle,
        tp.approveGuestConfirm,
        [
          { text: tp.approveGuestCancel, style: "cancel" },
          {
            text: tp.approveGuestAction,
            style: "default",
            onPress: () => approveMutation.mutate(),
          },
        ]
      );
    }
  }

  return (
    <View style={styles.root}>
      <View
        style={[styles.navBar, { paddingTop: topPad, height: topPad + 52 }]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>
          {patient.fullName}
        </Text>
        <View style={styles.navRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              (Platform.OS === "web" ? 34 : insets.bottom) + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GuestHeroCard
          patient={patient}
          onApprove={handleApprove}
          approving={approveMutation.isPending}
        />

        <GuestInfoCard
          info={{
            phoneE164: patient.phoneE164,
            email: patient.email,
            nationality: patient.nationality,
            nationalityCode: patient.nationalityCode,
            passportNo: patient.passportNo,
            dateOfBirth: patient.dateOfBirth,
            arrivalDate: patient.arrivalDate,
            departureDate: patient.departureDate,
            notes: patient.notes,
            requestedServices: patient.requestedServices ?? [],
            companionRelation: patient.companionRelation,
            emergencyContactName: patient.emergencyContactName,
            emergencyContactPhoneE164: patient.emergencyContactPhoneE164,
          }}
        />

        {nextAppointment ? (
          <View style={[styles.apptCard, cardShadow]}>
            <View style={styles.apptHeaderRow}>
              <Ionicons name="calendar-outline" size={14} color={T.success} />
              <Text style={styles.apptBadge}>{tp.nextAppt}</Text>
              <View style={styles.apptHeaderActions}>
                <Pressable
                  onPress={() => setShowApptSheet(true)}
                  style={styles.apptAddBtn}
                  hitSlop={8}
                >
                  <Ionicons name="add-circle-outline" size={18} color={T.accent} />
                </Pressable>
                <Pressable
                  onPress={() =>
                    handleCancelAppointment(
                      nextAppointment.id,
                      nextAppointment.title ?? DISPLAY_TERMS.appointment
                    )
                  }
                  style={styles.apptCancelBtn}
                  hitSlop={8}
                  disabled={cancellingApptId === nextAppointment.id}
                >
                  {cancellingApptId === nextAppointment.id ? (
                    <ActivityIndicator size="small" color={T.danger} />
                  ) : (
                    <Ionicons name="close-circle-outline" size={18} color={T.danger} />
                  )}
                </Pressable>
              </View>
            </View>
            <Text style={styles.apptTitle}>
              {nextAppointment.title ?? DISPLAY_TERMS.appointment}
            </Text>
            <Text style={styles.apptMeta}>
              {fmtDateTime(nextAppointment.startAt, bcp47)}
              {nextAppointment.doctor
                ? `  ·  ${nextAppointment.doctor.fullName}`
                : ""}
            </Text>
          </View>
        ) : (
          <View style={[styles.apptEmptyCard, cardShadow]}>
            <View style={styles.apptEmptyLeft}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={T.textMuted}
              />
              <Text style={styles.apptEmptyText}>{tp.noUpcomingAppts}</Text>
            </View>
            <Pressable
              onPress={() => setShowApptSheet(true)}
              style={styles.apptCreateBtn}
            >
              <Ionicons name="add" size={14} color="#fff" />
              <Text style={styles.apptCreateBtnText}>{tp.schedule}</Text>
            </Pressable>
          </View>
        )}

        <GuestTrackingStepper
          currentStep={tracking.currentStep}
          onUpdateStep={(step) => trackingMutation.mutate(step)}
          updating={trackingMutation.isPending}
        />

        <Text style={styles.sectionLabel}>{tp.sectionAssignments}</Text>

        <TransportAssignmentCard
          transport={assignments.transport}
          onAssign={() => setShowTransportSheet(true)}
        />

        <HotelAssignmentCard
          hotel={assignments.hotel}
          onAssign={() => setShowHotelSheet(true)}
        />

        <DocumentsAssignmentCard
          docs={documents.assigned ?? []}
          summary={documents.summary ?? { pending: 0, uploaded: 0 }}
          onAssign={() => setShowDocSheet(true)}
          onViewPdf={handleViewPdf}
          onUpdateDocStatus={async (docId, status, rejectionReason) => {
            await updateDocStatusMutation.mutateAsync({ docId, status, rejectionReason });
          }}
        />

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneLabel}>{tp.sectionDeviceMgmt}</Text>
          <Pressable
            style={[styles.dangerBtn, resetDeviceMutation.isPending && { opacity: 0.6 }]}
            onPress={() => {
              if (Platform.OS === "web") {
                if (typeof window !== "undefined" && window.confirm(`Reset device binding for ${patient.fullName}? They will be able to log in from a new device.`)) {
                  resetDeviceMutation.mutate();
                }
              } else {
                Alert.alert(
                  "Reset Device Binding",
                  `${patient.fullName} will be signed out and can log in from any device.\n\nKey: ${patient.patientKey}`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reset",
                      style: "destructive",
                      onPress: () => resetDeviceMutation.mutate(),
                    },
                  ]
                );
              }
            }}
            disabled={resetDeviceMutation.isPending}
          >
            {resetDeviceMutation.isPending ? (
              <ActivityIndicator size="small" color={T.danger} />
            ) : (
              <>
                <Ionicons name="phone-portrait-outline" size={16} color={T.danger} />
                <Text style={styles.dangerBtnText}>{tp.resetDeviceBtn}</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.dangerBtnHint}>{tp.resetDeviceHint}</Text>
        </View>
      </ScrollView>

      <AssignTransportSheet
        visible={showTransportSheet}
        onClose={() => setShowTransportSheet(false)}
        onSelect={(tId) => assignTransportMutation.mutate(tId)}
        assigning={assignTransportMutation.isPending}
      />

      <AssignHotelSheet
        visible={showHotelSheet}
        onClose={() => setShowHotelSheet(false)}
        onSelect={(hId) => assignHotelMutation.mutate(hId)}
        assigning={assignHotelMutation.isPending}
      />

      <AssignDocTypeSheet
        visible={showDocSheet}
        onClose={() => setShowDocSheet(false)}
        onAssign={(typeId, instructionText) =>
          assignDocMutation.mutate({ typeId, instructionText })
        }
        assigning={assignDocMutation.isPending}
      />

      <CreateAppointmentSheet
        visible={showApptSheet}
        patientId={id ?? ""}
        onClose={() => setShowApptSheet(false)}
        onCreated={() => {
          invalidate();
          showToast(tp.toastApptCreated);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  navBar: {
    backgroundColor: T.surface,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: T.sp16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 17,
    color: T.text,
    textAlign: "center",
    marginHorizontal: 4,
  },
  navRight: {
    width: 36,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: T.sp16,
  },
  sectionLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: T.sp12,
    marginTop: 4,
  },
  apptCard: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp16,
    marginBottom: T.sp12,
    borderLeftWidth: 3,
    borderLeftColor: T.success,
  },
  apptHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },
  apptBadge: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: T.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  apptHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  apptAddBtn: {
    padding: 2,
  },
  apptCancelBtn: {
    padding: 2,
  },
  apptEmptyCard: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    paddingHorizontal: T.sp16,
    paddingVertical: 14,
    marginBottom: T.sp12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: "dashed",
  },
  apptEmptyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  apptEmptyText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.textMuted,
  },
  apptCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.accent,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: T.r8,
  },
  apptCreateBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  apptTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: T.text,
    marginBottom: 3,
  },
  apptMeta: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textSec,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: T.sp32,
    backgroundColor: T.bg,
  },
  loadingText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.textMuted,
    marginTop: 12,
  },
  errorTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: T.text,
    marginTop: 12,
  },
  errorSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: T.r10,
    backgroundColor: T.accent,
  },
  retryText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  dangerZone: {
    marginTop: T.sp16,
    padding: T.sp16,
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.danger + "30",
    gap: T.sp8,
    ...cardShadow,
  },
  dangerZoneLabel: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp8,
    paddingVertical: 10,
    paddingHorizontal: T.sp12,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.danger + "40",
    backgroundColor: T.danger + "08",
  },
  dangerBtnText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.danger,
  },
  dangerBtnHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 17,
  },
});
