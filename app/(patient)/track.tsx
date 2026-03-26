import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestDashboard } from "@/hooks/guest/useGuestDashboard";
import { useGuestDocuments } from "@/hooks/guest/useGuestDocuments";
import type { PatientDocument } from "@/hooks/guest/useGuestDashboard";
import { openPdf } from "@/services/files/FileService";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl, queryClient as qc } from "@/lib/query-client";
import { T, cardShadow } from "@/constants/adminTheme";

type InnerTab = "journey" | "documents";

const INNER_TABS: { key: InnerTab; label: string; icon: string }[] = [
  { key: "journey", label: "Journey", icon: "map-outline" },
  { key: "documents", label: "Documents", icon: "document-text-outline" },
];

const JOURNEY_STEPS: { icon: string; label: string; sub: string }[] = [
  { icon: "airplane-outline",    label: "Arrived at Airport",      sub: "You've landed — welcome!" },
  { icon: "car-sport-outline",   label: "Picked Up by Driver",     sub: "Transport en route to hotel" },
  { icon: "bed-outline",         label: "Arrived at Hotel",        sub: "Check-in and settle in" },
  { icon: "medkit-outline",      label: "Attended Appointment",    sub: "Your procedure / consultation" },
  { icon: "airplane-outline",    label: "Returned to Airport",     sub: "Heading back home" },
  { icon: "home-outline",        label: "Arrived Home",            sub: "Journey complete — take care!" },
];

function deriveCurrentStep(
  arrivalDate: string | null | undefined,
  departureDate: string | null | undefined,
  hasTransport: boolean,
  hasHotel: boolean,
  hasDoneAppt: boolean
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const arrival = arrivalDate ? new Date(arrivalDate) : null;
  if (arrival) arrival.setHours(0, 0, 0, 0);

  const departure = departureDate ? new Date(departureDate) : null;
  if (departure) departure.setHours(0, 0, 0, 0);

  if (departure && today > departure) return 6;
  if (departure && today >= departure) return 5;
  if (hasDoneAppt) return 4;
  if (hasHotel && arrival && today >= arrival) return 3;
  if (hasTransport && arrival && today >= arrival) return 2;
  if (arrival && today >= arrival) return 1;
  return 0;
}

function JourneyTab() {
  const { patient, transport, hotel, appointments } = useGuestDashboard();
  const hasDoneAppt = appointments.some((a) => a.status === "DONE");
  const currentStep = deriveCurrentStep(
    patient?.arrivalDate,
    patient?.departureDate,
    !!transport,
    !!hotel,
    hasDoneAppt
  );

  const hasAnyData = patient?.arrivalDate || transport || hotel;

  if (!hasAnyData) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="map-outline" size={48} color={T.textMuted} />
        <Text style={styles.emptyTitle}>Journey not started</Text>
        <Text style={styles.emptyBody}>
          Your clinic will update your journey status here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.stepperContainer}>
      {JOURNEY_STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture = stepNum > currentStep;

        return (
          <View key={i} style={styles.stepRow}>
            {/* Left column: line + circle */}
            <View style={styles.stepLeft}>
              {i > 0 ? (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: isDone ? T.success : T.border },
                  ]}
                />
              ) : (
                <View style={styles.stepLineSpacer} />
              )}
              <View
                style={[
                  styles.stepCircle,
                  isDone && styles.stepCircleDone,
                  isCurrent && styles.stepCircleCurrent,
                  isFuture && styles.stepCircleFuture,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : isCurrent ? (
                  <Ionicons name={step.icon as any} size={14} color="#fff" />
                ) : (
                  <Text style={styles.stepNum}>{stepNum}</Text>
                )}
              </View>
              {i < JOURNEY_STEPS.length - 1 ? (
                <View
                  style={[
                    styles.stepLineBottom,
                    { backgroundColor: isDone ? T.success : T.border },
                  ]}
                />
              ) : null}
            </View>

            {/* Right column: content */}
            <View style={[styles.stepContent, isCurrent && styles.stepContentCurrent]}>
              <View style={styles.stepHeader}>
                <Text
                  style={[
                    styles.stepLabel,
                    isFuture && styles.stepLabelFuture,
                    isDone && styles.stepLabelDone,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                >
                  {step.label}
                </Text>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.stepSub, isFuture && styles.stepSubFuture]}>
                {step.sub}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Pending Upload",
  UPLOADED: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ASSIGNED: { bg: T.warningBg, text: T.warning },
  UPLOADED: { bg: "#EFF6FF", text: T.accent },
  APPROVED: { bg: T.successBg, text: T.success },
  REJECTED: { bg: T.dangerBg, text: T.danger },
};

function DocCard({
  doc,
  accessToken,
  onRefresh,
}: {
  doc: PatientDocument;
  accessToken: string | null;
  onRefresh: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [opening, setOpening] = useState(false);

  const colors = STATUS_COLORS[doc.status] ?? { bg: T.inactiveBg, text: T.textSec };
  const canUpload = doc.status === "ASSIGNED" || doc.status === "REJECTED";
  const canOpen = !!doc.fileUrl && ["UPLOADED", "APPROVED"].includes(doc.status);

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setUploading(true);
      const file = result.assets[0];
      const formData = new FormData();
      // @ts-ignore
      formData.append("file", { uri: file.uri, name: file.name || "document.pdf", type: "application/pdf" });
      const res = await fetch(`${getApiUrl()}v1/patient/documents/${doc.id}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Upload failed");
      }
      onRefresh();
    } catch (e: any) {
      Alert.alert("Upload failed", e.message ?? "Please try again");
    } finally {
      setUploading(false);
    }
  }

  async function handleOpen() {
    if (!accessToken) return;
    try {
      setOpening(true);
      const resp = await fetch(`${getApiUrl()}v1/documents/${doc.id}/signed-url`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!resp.ok) throw new Error("Failed to get download link");
      const body = (await resp.json()) as { url: string; fileName?: string };
      const fullUrl = body.url.startsWith("http")
        ? body.url
        : `${getApiUrl().replace(/\/$/, "")}${body.url}`;
      await openPdf(fullUrl, body.fileName ?? "document.pdf");
    } catch (e: any) {
      Alert.alert("Could not open PDF", e.message ?? "Unexpected error");
    } finally {
      setOpening(false);
    }
  }

  return (
    <View style={[styles.docCard, cardShadow]}>
      <View style={styles.docTop}>
        <View style={styles.docIconWrap}>
          <Ionicons name="document-text-outline" size={20} color={T.accent} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>
            {doc.documentType?.name ?? "Document"}
          </Text>
          {doc.instructionText ? (
            <Text style={styles.docInstruction} numberOfLines={2}>
              {doc.instructionText}
            </Text>
          ) : null}
        </View>
        <View style={[styles.pill, { backgroundColor: colors.bg }]}>
          <Text style={[styles.pillText, { color: colors.text }]}>
            {STATUS_LABELS[doc.status] ?? doc.status}
          </Text>
        </View>
      </View>

      {doc.status === "REJECTED" && doc.rejectionReason ? (
        <View style={styles.rejectionBox}>
          <Ionicons name="alert-circle-outline" size={14} color={T.danger} />
          <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
        </View>
      ) : null}

      {(canUpload || canOpen) ? (
        <View style={styles.docActions}>
          {canUpload && (
            <Pressable
              style={[styles.actionBtn, styles.uploadBtn, uploading && styles.btnDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
                  <Text style={styles.uploadBtnText}>
                    {doc.status === "REJECTED" ? "Re-upload PDF" : "Upload PDF"}
                  </Text>
                </>
              )}
            </Pressable>
          )}
          {canOpen && (
            <Pressable
              style={[styles.actionBtn, styles.openBtn, opening && styles.btnDisabled]}
              onPress={handleOpen}
              disabled={opening}
            >
              {opening ? (
                <ActivityIndicator size="small" color={T.accent} />
              ) : (
                <>
                  <Ionicons name="open-outline" size={15} color={T.accent} />
                  <Text style={styles.openBtnText}>Open PDF</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

function DocumentsTab() {
  const { accessToken } = useAuth();
  const { isLoading, isError, refetch, documents, pendingCount, totalCount } = useGuestDocuments();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["/v1/patient/dashboard"] });
  }

  async function onRefresh() {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }

  if (isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={styles.centerText}>Loading documents…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerBox}>
        <Ionicons name="alert-circle-outline" size={40} color={T.danger} />
        <Text style={styles.errorText}>Couldn't load documents</Text>
        <Pressable onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (documents.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Ionicons name="document-text-outline" size={48} color={T.textMuted} />
        <Text style={styles.emptyTitle}>No documents yet</Text>
        <Text style={styles.emptyBody}>
          Your clinic will assign documents for you to upload here.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.docsScroll}
      contentContainerStyle={styles.docsContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
      }
    >
      {totalCount > 0 && (
        <View style={styles.docsSummary}>
          <Text style={styles.docsSummaryText}>
            {totalCount} document{totalCount !== 1 ? "s" : ""}
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
          </Text>
        </View>
      )}
      {documents.map((doc) => (
        <DocCard key={doc.id} doc={doc} accessToken={accessToken} onRefresh={handleRefresh} />
      ))}
    </ScrollView>
  );
}

export default function TrackScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const [activeTab, setActiveTab] = useState<InnerTab>("journey");

  return (
    <View style={[styles.root, { paddingBottom: 0 }]}>
      <GuestHeader title="Track" />

      {/* Inner segmented tabs */}
      <View style={styles.segmentRow}>
        {INNER_TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.segment, activeTab === tab.key && styles.segmentActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={15}
              color={activeTab === tab.key ? T.accent : T.textMuted}
            />
            <Text
              style={[styles.segmentText, activeTab === tab.key && styles.segmentTextActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === "journey" ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <JourneyTab />
        </ScrollView>
      ) : (
        <View style={[styles.docsWrapper, { paddingBottom: tabBarHeight }]}>
          <DocumentsTab />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentActive: {
    borderBottomColor: T.accent,
    backgroundColor: "#F0F7FF",
  },
  segmentText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.textSec,
  },
  segmentTextActive: {
    fontFamily: "Inter_700Bold",
    color: T.accent,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: T.sp16,
    gap: T.sp12,
  },

  // Journey tab
  stepperContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    gap: T.sp12,
  },
  stepLeft: {
    alignItems: "center",
    width: 32,
  },
  stepLineSpacer: {
    height: 10,
  },
  stepLine: {
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  stepLineBottom: {
    width: 2,
    flex: 1,
    borderRadius: 1,
    minHeight: 20,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.inactiveBg,
    borderWidth: 2,
    borderColor: T.border,
  },
  stepCircleDone: {
    backgroundColor: T.success,
    borderColor: T.success,
  },
  stepCircleCurrent: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  stepCircleFuture: {
    backgroundColor: T.surface,
    borderColor: T.border,
  },
  stepNum: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: T.textMuted,
  },
  stepContent: {
    flex: 1,
    paddingBottom: T.sp20,
    paddingTop: 5,
  },
  stepContentCurrent: {
    backgroundColor: "#EFF6FF",
    borderRadius: T.r12,
    padding: T.sp12,
    marginBottom: T.sp4,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stepLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.text,
  },
  stepLabelDone: {
    color: T.textSec,
  },
  stepLabelCurrent: {
    color: T.accent,
  },
  stepLabelFuture: {
    color: T.textMuted,
  },
  stepSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    marginTop: 2,
    lineHeight: 18,
  },
  stepSubFuture: {
    color: T.textMuted,
  },
  currentBadge: {
    backgroundColor: T.accent,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#fff",
  },

  // Documents tab
  docsWrapper: {
    flex: 1,
  },
  docsScroll: {
    flex: 1,
  },
  docsContent: {
    padding: T.sp16,
    gap: T.sp10,
    paddingBottom: 16,
  },
  docsSummary: {
    paddingBottom: T.sp4,
  },
  docsSummaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  docCard: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: 14,
    gap: T.sp10,
  },
  docTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.sp10,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: T.r10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  docInfo: {
    flex: 1,
    gap: 3,
  },
  docName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
  },
  docInstruction: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    lineHeight: 16,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: T.sp10,
    backgroundColor: T.dangerBg,
    borderRadius: T.r8,
    borderLeftWidth: 3,
    borderLeftColor: T.danger,
  },
  rejectionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.dangerText,
    flex: 1,
    lineHeight: 16,
  },
  docActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: T.r8,
  },
  uploadBtn: {
    backgroundColor: T.accent,
    flex: 1,
    justifyContent: "center",
  },
  uploadBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  openBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  openBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.accent,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  // Empty / error states
  emptyBox: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
  },
  emptyBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  centerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.textMuted,
  },
  errorText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
  },
  retryBtn: {
    backgroundColor: T.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});

