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
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }) + " · " + d.toLocaleTimeString("en-US", {
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

  const [showTransportSheet, setShowTransportSheet] = useState(false);
  const [showHotelSheet, setShowHotelSheet] = useState(false);
  const [showDocSheet, setShowDocSheet] = useState(false);

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
      showToast("Guest approved ✓");
    },
    onError: () => showToast("Approval failed"),
  });

  const trackingMutation = useMutation({
    mutationFn: (step: string) =>
      apiRequest("PUT", `/v1/manager/patients/${id}/tracking`, {
        currentStep: step,
      }),
    onSuccess: () => {
      invalidate();
    },
    onError: () => showToast("Failed to update step"),
  });

  const assignTransportMutation = useMutation({
    mutationFn: (transportId: string) =>
      apiRequest("PUT", `/v1/manager/patients/${id}/assign-transport`, {
        transportId,
      }),
    onSuccess: () => {
      setShowTransportSheet(false);
      invalidate();
      showToast("Transport assigned ✓");
    },
    onError: () => showToast("Failed to assign transport"),
  });

  const assignHotelMutation = useMutation({
    mutationFn: (hotelId: string) =>
      apiRequest("PUT", `/v1/manager/patients/${id}/assign-hotel`, {
        hotelId,
      }),
    onSuccess: () => {
      setShowHotelSheet(false);
      invalidate();
      showToast("Hotel assigned ✓");
    },
    onError: () => showToast("Failed to assign hotel"),
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
        items: [{ documentTypeId: typeId, instructionText: instructionText || null }],
      }),
    onSuccess: () => {
      setShowDocSheet(false);
      invalidate();
      showToast("Document assigned ✓");
    },
    onError: () => showToast("Failed to assign document"),
  });

  const handleViewPdf = async (docId: string) => {
    try {
      const baseUrl = getApiUrl();
      const resp = await fetch(`${baseUrl}v1/documents/${docId}/signed-url`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!resp.ok) throw new Error("Failed to get download link");
      const { url } = await resp.json() as { url: string };
      const fullUrl = url.startsWith("http") ? url : `${baseUrl.replace(/\/$/, "")}${url}`;
      await Linking.openURL(fullUrl);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not open document");
    }
  };

  const topPad =
    Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.centerBox, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={styles.loadingText}>Loading guest…</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={[styles.centerBox, { paddingTop: topPad }]}>
        <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
        <Text style={styles.errorTitle}>Couldn't load guest</Text>
        <Text style={styles.errorSub}>Check connection and try again</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try Again</Text>
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
        "Approve Guest",
        `Approve ${patient.fullName} and begin their journey?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
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

        {nextAppointment && (
          <View style={[styles.apptCard, cardShadow]}>
            <View style={styles.apptHeaderRow}>
              <Ionicons name="calendar-outline" size={14} color={T.success} />
              <Text style={styles.apptBadge}>Next Appointment</Text>
            </View>
            <Text style={styles.apptTitle}>
              {nextAppointment.title ?? "Appointment"}
            </Text>
            <Text style={styles.apptMeta}>
              {fmtDateTime(nextAppointment.startAt)}
              {nextAppointment.doctor
                ? `  ·  Dr. ${nextAppointment.doctor.fullName}`
                : ""}
            </Text>
          </View>
        )}

        <GuestTrackingStepper
          currentStep={tracking.currentStep}
          onUpdateStep={(step) => trackingMutation.mutate(step)}
          updating={trackingMutation.isPending}
        />

        <Text style={styles.sectionLabel}>Assignments</Text>

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
        />
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
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  apptTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
    marginBottom: 3,
  },
  apptMeta: {
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.textMuted,
    marginTop: 12,
  },
  errorTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
    marginTop: 12,
  },
  errorSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: T.sp24,
    paddingVertical: 12,
    borderRadius: T.r10,
    backgroundColor: T.accent,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
