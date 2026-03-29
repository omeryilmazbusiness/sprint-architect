import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  LayoutChangeEvent,
  Linking,
} from "react-native";
import { useTabBarMetrics } from "@/components/layout/TabBarMetricsContext";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
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

const TABS: { key: InnerTab; label: string }[] = [
  { key: "journey",   label: "Journey"   },
  { key: "documents", label: "Documents" },
];

const JOURNEY_STEPS: { icon: string; label: string; sub: string }[] = [
  { icon: "airplane-outline",  label: "Pre-Arrival",              sub: "You've landed — welcome!" },
  { icon: "car-sport-outline", label: "Arrival & Transfer",       sub: "Transport en route to hotel" },
  { icon: "bed-outline",       label: "Hotel Check-In",           sub: "Check-in and settle in" },
  { icon: "medkit-outline",    label: "Treatment",                sub: "Your procedure / consultation" },
  { icon: "airplane-outline",  label: "Recovery & Follow-Up",     sub: "Heading back home" },
  { icon: "home-outline",      label: "Departure",                sub: "Journey complete — take care!" },
];

const MANAGER_STEP_TO_NUM: Record<string, number> = {
  PRE_ARRIVAL: 1,
  ARRIVAL_TRANSFER: 2,
  HOTEL_CHECKIN: 3,
  TREATMENT: 4,
  FOLLOWUP: 5,
  DEPARTURE: 6,
};

function deriveCurrentStep(
  arrivalDate: string | null | undefined,
  departureDate: string | null | undefined,
  hasTransport: boolean,
  hasHotel: boolean,
  hasDoneAppt: boolean
): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const arrival   = arrivalDate   ? (() => { const d = new Date(arrivalDate);   d.setHours(0,0,0,0); return d; })() : null;
  const departure = departureDate ? (() => { const d = new Date(departureDate); d.setHours(0,0,0,0); return d; })() : null;
  if (departure && today > departure) return 6;
  if (departure && today >= departure) return 5;
  if (hasDoneAppt) return 4;
  if (hasHotel && arrival && today >= arrival) return 3;
  if (hasTransport && arrival && today >= arrival) return 2;
  if (arrival && today >= arrival) return 1;
  return 0;
}

// ─── Premium Animated Segmented Control ─────────────────────────────────────

function SegmentedControl({
  active,
  onChange,
}: {
  active: InnerTab;
  onChange: (t: InnerTab) => void;
}) {
  const slideAnim = useRef(new Animated.Value(active === "journey" ? 0 : 1)).current;
  const [trackW, setTrackW] = useState(0);

  function onLayout(e: LayoutChangeEvent) {
    setTrackW(e.nativeEvent.layout.width);
  }

  function handlePress(tab: InnerTab) {
    const toValue = tab === "journey" ? 0 : 1;
    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 340,
      friction: 28,
    }).start();
    onChange(tab);
  }

  const pillW = trackW > 0 ? trackW / 2 : 0;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pillW],
  });

  return (
    <View style={sc.wrap}>
      <View style={sc.track} onLayout={onLayout}>
        {trackW > 0 && (
          <Animated.View
            style={[sc.pill, { width: pillW, transform: [{ translateX }] }]}
          />
        )}
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            style={sc.tab}
            onPress={() => handlePress(t.key)}
          >
            <Text
              style={[
                sc.label,
                active === t.key ? sc.labelActive : sc.labelInactive,
              ]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  wrap: {
    paddingHorizontal: T.sp16,
    paddingVertical: T.sp12,
    backgroundColor: T.bg,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  track: {
    flexDirection: "row",
    backgroundColor: T.surfaceSubtle,
    borderRadius: 50,
    padding: 3,
    position: "relative",
    height: 40,
  },
  pill: {
    position: "absolute",
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 50,
    backgroundColor: T.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  labelActive: { color: T.accent },
  labelInactive: { color: T.textMuted },
});

// ─── Next Action Card ─────────────────────────────────────────────────────────

const ACTION_CFG = {
  doc: { icon: "document-attach-outline" as const, color: T.warning, bg: T.warningBg, border: "#FDE68A" },
  appt: { icon: "calendar-outline" as const, color: T.accent, bg: "#EFF6FF", border: "#BFDBFE" },
  transport: { icon: "car-outline" as const, color: T.textSec, bg: T.surfaceSubtle, border: T.border },
};

function NextActionCard() {
  const { documents, appointments, transport } = useGuestDashboard();

  const action = useMemo(() => {
    const pending = documents.filter(d => d.status === "ASSIGNED" || d.status === "REJECTED");
    if (pending.length > 0) {
      const n = pending.length;
      return {
        type: "doc" as const,
        title: `${n} document${n > 1 ? "s" : ""} need${n === 1 ? "s" : ""} your attention`,
        sub: "Upload or re-upload required files to proceed.",
        cta: "Open Documents",
        onCta: () => router.push({ pathname: "/(patient)/track", params: { tab: "documents" } }),
      };
    }
    const now = new Date();
    const todayAppt = appointments.find(a => {
      const d = new Date(a.startAt);
      return d.toDateString() === now.toDateString() && a.status !== "CANCELLED";
    });
    if (todayAppt) {
      const time = new Date(todayAppt.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return {
        type: "appt" as const,
        title: `Appointment today at ${time}`,
        sub: `${todayAppt.title}${todayAppt.doctor?.fullName ? ` · Dr. ${todayAppt.doctor.fullName}` : ""}`,
        cta: "View Schedule",
        onCta: () => router.push("/(patient)/schedule"),
      };
    }
    const next = appointments
      .filter(a => a.status === "SCHEDULED" && new Date(a.startAt) > now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0];
    if (next) {
      const d = new Date(next.startAt);
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const time  = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return {
        type: "appt" as const,
        title: `Next: ${next.title}`,
        sub: `${label} at ${time}${next.doctor?.fullName ? ` · Dr. ${next.doctor.fullName}` : ""}`,
        cta: "View Schedule",
        onCta: () => router.push("/(patient)/schedule"),
      };
    }
    return null;
  }, [documents, appointments, transport]);

  if (!action) return null;
  const cfg = ACTION_CFG[action.type];

  return (
    <View style={[na.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[na.iconWrap, { backgroundColor: "rgba(0,0,0,0.05)" }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={na.body}>
        <Text style={[na.title, { color: cfg.color }]}>{action.title}</Text>
        <Text style={na.sub} numberOfLines={2}>{action.sub}</Text>
      </View>
      <Pressable style={[na.btn, { backgroundColor: cfg.color }]} onPress={action.onCta}>
        <Text style={na.btnTxt}>{action.cta}</Text>
      </Pressable>
    </View>
  );
}

const na = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    marginHorizontal: T.sp16,
    marginTop: T.sp10,
    marginBottom: 2,
    padding: T.sp12,
    borderRadius: T.r16,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: T.r12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { flex: 1, gap: 3 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#555",
    lineHeight: 16,
  },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: T.r10,
    flexShrink: 0,
  },
  btnTxt: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
});

// ─── Journey Stepper ────────────────────────────────────────────────────────

function JourneyTab() {
  const { patient, tracking, transport, hotel, appointments } = useGuestDashboard();
  const hasDoneAppt = appointments.some((a) => a.status === "DONE");

  const persistedStep = tracking?.currentStep
    ? (MANAGER_STEP_TO_NUM[tracking.currentStep] ?? 0)
    : 0;

  const currentStep = persistedStep > 0
    ? persistedStep
    : deriveCurrentStep(
        patient?.arrivalDate,
        patient?.departureDate,
        !!transport,
        !!hotel,
        hasDoneAppt,
      );

  const hasAnyData = patient?.arrivalDate || transport || hotel || persistedStep > 0;

  if (!hasAnyData) {
    return (
      <View style={js.emptyWrap}>
        <View style={js.emptyIcon}>
          <Ionicons name="map-outline" size={28} color={T.textMuted} />
        </View>
        <Text style={js.emptyTitle}>Journey not started</Text>
        <Text style={js.emptySub}>Your clinic will update your journey status here.</Text>
      </View>
    );
  }

  const hasClinicContact = patient?.clinicSupportPhone || patient?.clinicSupportEmail;

  return (
    <>
    <View style={js.stepper}>
      {JOURNEY_STEPS.map((step, i) => {
        const stepNum = i + 1;
        const isDone    = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        const isFuture  = stepNum > currentStep;
        const isLast    = i === JOURNEY_STEPS.length - 1;

        return (
          <View key={i} style={js.row}>
            {/* Left rail */}
            <View style={js.rail}>
              {/* Top connector */}
              {i > 0 && (
                <View style={[js.line, { backgroundColor: stepNum <= currentStep ? "#059669" : T.border }]} />
              )}

              {/* Node */}
              <View
                style={[
                  js.node,
                  isDone    && js.nodeDone,
                  isCurrent && js.nodeCurrent,
                  isFuture  && js.nodeFuture,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                ) : isCurrent ? (
                  <View style={js.nodePulse} />
                ) : (
                  <View style={js.nodeHollow} />
                )}
              </View>

              {/* Bottom connector */}
              {!isLast && (
                <View style={[js.lineBottom, { backgroundColor: isDone ? "#059669" : T.border }]} />
              )}
            </View>

            {/* Content */}
            <View style={[js.content, isCurrent && js.contentCurrent, isLast && js.contentLast]}>
              <View style={js.titleRow}>
                <Text style={[js.label, isDone && js.labelDone, isCurrent && js.labelCurrent, isFuture && js.labelFuture]}>
                  {step.label}
                </Text>
                {isCurrent && (
                  <View style={js.badge}>
                    <View style={js.badgeDot} />
                    <Text style={js.badgeText}>Now</Text>
                  </View>
                )}
              </View>
              <Text style={[js.sub, isFuture && js.subFuture]}>{step.sub}</Text>
            </View>
          </View>
        );
      })}
    </View>

    {hasClinicContact ? (
      <View style={js.supportCard}>
        <View style={js.supportIconWrap}>
          <Ionicons name="headset-outline" size={20} color={T.accent} />
        </View>
        <View style={js.supportBody}>
          <Text style={js.supportTitle}>
            {patient?.clinicName ? `${patient.clinicName} Support` : "Clinic Support"}
          </Text>
          {patient?.clinicSupportPhone ? (
            <Pressable
              style={js.supportRow}
              onPress={() => Linking.openURL(`tel:${patient!.clinicSupportPhone}`)}
            >
              <Ionicons name="call-outline" size={13} color={T.accent} />
              <Text style={js.supportLink}>{patient.clinicSupportPhone}</Text>
            </Pressable>
          ) : null}
          {patient?.clinicSupportEmail ? (
            <Pressable
              style={js.supportRow}
              onPress={() => Linking.openURL(`mailto:${patient!.clinicSupportEmail}`)}
            >
              <Ionicons name="mail-outline" size={13} color={T.accent} />
              <Text style={js.supportLink}>{patient.clinicSupportEmail}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    ) : null}
    </>
  );
}

const js = StyleSheet.create({
  stepper: { paddingTop: T.sp8 },
  row: { flexDirection: "row" },
  rail: { width: 44, alignItems: "center" },
  line: { width: 2, height: 12 },
  lineBottom: { width: 2, flex: 1, minHeight: 20 },
  node: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surfaceSubtle,
    borderWidth: 2,
    borderColor: T.border,
  },
  nodeDone: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  nodeCurrent: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  nodeFuture: {
    backgroundColor: T.surface,
    borderColor: T.border,
  },
  nodePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  nodeHollow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.border,
  },
  content: {
    flex: 1,
    paddingBottom: T.sp20,
    paddingTop: 4,
    paddingLeft: 4,
    borderRadius: T.r12,
  },
  contentCurrent: {
    backgroundColor: "#EFF6FF",
    padding: T.sp12,
    paddingLeft: T.sp12,
    marginBottom: T.sp4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  contentLast: { paddingBottom: T.sp8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
    lineHeight: 20,
  },
  labelDone: { color: T.textSec },
  labelCurrent: { color: T.accent },
  labelFuture: { color: T.textMuted },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.accent,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#fff" },
  badgeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#fff" },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textSec,
    marginTop: 2,
    lineHeight: 17,
  },
  subFuture: { color: T.textMuted },
  emptyWrap: { alignItems: "center", paddingVertical: 64, paddingHorizontal: 32, gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: T.text },
  emptySub:  {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.sp12,
    marginTop: T.sp16,
    marginHorizontal: T.sp4,
    backgroundColor: "rgba(3,105,161,0.05)",
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: T.sp16,
  },
  supportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: T.r12,
    backgroundColor: "rgba(3,105,161,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  supportBody: { flex: 1, gap: 6 },
  supportTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
    marginBottom: 2,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  supportLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.accent,
    textDecorationLine: "underline",
  },
});

// ─── Documents Tab ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Pending",
  UPLOADED: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ASSIGNED: { bg: T.warningBg,  text: T.warning },
  UPLOADED: { bg: "#EFF6FF",   text: T.accent  },
  APPROVED: { bg: T.successBg, text: T.success  },
  REJECTED: { bg: T.dangerBg,  text: T.danger   },
};
const STATUS_ORDER: Record<string, number> = { ASSIGNED: 0, REJECTED: 1, UPLOADED: 2, APPROVED: 3 };

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
  const [opening, setOpening]     = useState(false);
  const [removing, setRemoving]   = useState(false);
  const [expanded, setExpanded]   = useState(false);

  const colors    = STATUS_COLORS[doc.status] ?? { bg: T.surfaceSubtle, text: T.textSec };
  const canUpload = doc.status === "ASSIGNED" || doc.status === "REJECTED";
  const canOpen   = !!doc.fileUrl && ["UPLOADED", "APPROVED"].includes(doc.status);
  const canRemove = canOpen;

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
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
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message ?? "Upload failed"); }
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

  function confirmRemove() {
    Alert.alert(
      "Remove uploaded file?",
      "The PDF will be deleted and the document status will return to pending.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: handleRemove },
      ]
    );
  }

  async function handleRemove() {
    if (!accessToken) return;
    try {
      setRemoving(true);
      const res = await fetch(`${getApiUrl()}v1/patient/documents/${doc.id}/file`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message ?? "Remove failed"); }
      onRefresh();
    } catch (e: any) {
      Alert.alert("Could not remove file", e.message ?? "Please try again");
    } finally {
      setRemoving(false);
    }
  }

  const longInstructions = (doc.instructionText ?? "").length > 80;

  return (
    <View style={[ds.card, cardShadow]}>
      {/* Header row */}
      <View style={ds.cardTop}>
        <View style={ds.iconWrap}>
          <Ionicons name="document-text-outline" size={18} color={T.accent} />
        </View>
        <View style={ds.cardInfo}>
          <Text style={ds.docName} numberOfLines={1}>
            {doc.documentType?.name ?? "Document"}
          </Text>
          {doc.documentType?.isRequired ? (
            <Text style={ds.reqLabel}>Required</Text>
          ) : null}
        </View>
        <View style={[ds.statusPill, { backgroundColor: colors.bg }]}>
          <Text style={[ds.statusText, { color: colors.text }]}>
            {STATUS_LABELS[doc.status] ?? doc.status}
          </Text>
        </View>
      </View>

      {/* Instructions */}
      {doc.instructionText ? (
        <Pressable onPress={longInstructions ? () => setExpanded(e => !e) : undefined}>
          <Text
            style={ds.instruction}
            numberOfLines={expanded ? undefined : 2}
          >
            {doc.instructionText}
          </Text>
          {longInstructions && (
            <Text style={ds.showMore}>{expanded ? "Show less" : "Show more"}</Text>
          )}
        </Pressable>
      ) : null}

      {/* Rejection banner */}
      {doc.status === "REJECTED" && doc.rejectionReason ? (
        <View style={ds.rejBox}>
          <Ionicons name="alert-circle-outline" size={14} color={T.danger} />
          <Text style={ds.rejText}>{doc.rejectionReason}</Text>
        </View>
      ) : null}

      {/* Actions */}
      {(canUpload || canOpen || canRemove) ? (
        <View style={ds.actions}>
          {canUpload && (
            <Pressable
              style={[ds.btn, ds.btnUpload, uploading && ds.btnDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="cloud-upload-outline" size={14} color="#fff" /><Text style={ds.btnUploadTxt}>{doc.status === "REJECTED" ? "Re-upload" : "Upload PDF"}</Text></>
              }
            </Pressable>
          )}
          {canOpen && (
            <Pressable
              style={[ds.btn, ds.btnOpen, opening && ds.btnDisabled]}
              onPress={handleOpen}
              disabled={opening}
            >
              {opening
                ? <ActivityIndicator size="small" color={T.accent} />
                : <><Ionicons name="open-outline" size={14} color={T.accent} /><Text style={ds.btnOpenTxt}>Open PDF</Text></>
              }
            </Pressable>
          )}
          {canRemove && (
            <Pressable
              style={[ds.btn, ds.btnRemove, removing && ds.btnDisabled]}
              onPress={confirmRemove}
              disabled={removing}
            >
              {removing
                ? <ActivityIndicator size="small" color={T.danger} />
                : <><Ionicons name="trash-outline" size={14} color={T.danger} /><Text style={ds.btnRemoveTxt}>Remove</Text></>
              }
            </Pressable>
          )}
        </View>
      ) : null}
    </View>
  );
}

function DocumentsTab({ tabBarHeight }: { tabBarHeight: number }) {
  const { accessToken } = useAuth();
  const { isLoading, isError, refetch, documents, pendingCount, totalCount, uploaded } = useGuestDocuments();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["/v1/patient/dashboard"] });
  }

  async function onRefresh() {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = [...documents].sort(
      (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    );
    if (!q) return base;
    return base.filter(d =>
      (d.documentType?.name ?? "").toLowerCase().includes(q) ||
      (d.instructionText ?? "").toLowerCase().includes(q)
    );
  }, [documents, search]);

  if (isLoading) {
    return (
      <View style={ds.center}>
        <ActivityIndicator size="large" color={T.accent} />
        <Text style={ds.centerTxt}>Loading documents…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={ds.center}>
        <Ionicons name="alert-circle-outline" size={40} color={T.danger} />
        <Text style={ds.errTxt}>Couldn't load documents</Text>
        <Pressable onPress={() => refetch()} style={ds.retryBtn}>
          <Text style={ds.retryTxt}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (documents.length === 0) {
    return (
      <View style={ds.center}>
        <View style={ds.emptyIcon}>
          <Ionicons name="documents-outline" size={28} color={T.textMuted} />
        </View>
        <Text style={ds.emptyTitle}>No documents yet</Text>
        <Text style={ds.emptySub}>Your clinic will assign required documents here.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[ds.list, { paddingBottom: tabBarHeight + 24 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />}
    >
      {/* Summary bar */}
      <View style={ds.summary}>
        <View style={[ds.summaryChip, { backgroundColor: T.warningBg }]}>
          <Text style={[ds.summaryNum, { color: T.warning }]}>{pendingCount}</Text>
          <Text style={[ds.summaryLbl, { color: T.warning }]}>Pending</Text>
        </View>
        <View style={[ds.summaryChip, { backgroundColor: T.successBg }]}>
          <Text style={[ds.summaryNum, { color: T.success }]}>{uploaded.length}</Text>
          <Text style={[ds.summaryLbl, { color: T.success }]}>Uploaded</Text>
        </View>
        <View style={[ds.summaryChip, { backgroundColor: T.surfaceSubtle }]}>
          <Text style={[ds.summaryNum, { color: T.textSec }]}>{totalCount}</Text>
          <Text style={[ds.summaryLbl, { color: T.textSec }]}>Total</Text>
        </View>
      </View>

      {/* Search */}
      <View style={ds.searchWrap}>
        <Ionicons name="search-outline" size={16} color={T.textMuted} style={ds.searchIcon} />
        <TextInput
          style={ds.searchInput}
          placeholder="Search documents…"
          placeholderTextColor={T.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {filtered.length === 0 ? (
        <View style={ds.noResult}>
          <Text style={ds.noResultTxt}>No documents match "{search}"</Text>
        </View>
      ) : null}

      {filtered.map(doc => (
        <DocCard key={doc.id} doc={doc} accessToken={accessToken} onRefresh={handleRefresh} />
      ))}
    </ScrollView>
  );
}

const ds = StyleSheet.create({
  list: { padding: T.sp16, gap: T.sp10 },
  summary: { flexDirection: "row", gap: 8, marginBottom: T.sp4 },
  summaryChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: T.r12,
  },
  summaryNum:  { fontFamily: "Inter_700Bold", fontSize: 18 },
  summaryLbl:  { fontFamily: "Inter_400Regular", fontSize: 10, marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: T.sp12,
    marginBottom: T.sp8,
    height: 42,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
  },
  noResult: { paddingVertical: T.sp16, alignItems: "center" },
  noResultTxt: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textMuted },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp16,
    gap: T.sp10,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: T.sp10 },
  iconWrap: {
    width: 36, height: 36, borderRadius: T.r10,
    backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center",
  },
  cardInfo: { flex: 1, gap: 2 },
  docName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
  reqLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: T.warning },
  statusPill: {
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start",
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  instruction: {
    fontFamily: "Inter_400Regular", fontSize: 12,
    color: T.textSec, lineHeight: 17,
  },
  showMore: {
    fontFamily: "Inter_600SemiBold", fontSize: 11,
    color: T.accent, marginTop: 3,
  },
  rejBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 6,
    padding: T.sp10, backgroundColor: T.dangerBg,
    borderRadius: T.r8, borderLeftWidth: 3, borderLeftColor: T.danger,
  },
  rejText: {
    fontFamily: "Inter_400Regular", fontSize: 12,
    color: T.dangerText, flex: 1, lineHeight: 16,
  },
  actions: { flexDirection: "row", gap: 8 },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: T.r10,
  },
  btnUpload:    { backgroundColor: T.accent, flex: 1 },
  btnUploadTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  btnOpen:      { backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE" },
  btnOpenTxt:   { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.accent },
  btnRemove:    { backgroundColor: T.dangerBg, borderWidth: 1, borderColor: "#FECACA" },
  btnRemoveTxt: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: T.danger },
  btnDisabled:  { opacity: 0.6 },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 32, gap: 12,
  },
  centerTxt: { fontFamily: "Inter_500Medium", fontSize: 14, color: T.textMuted },
  errTxt:    { fontFamily: "Inter_700Bold", fontSize: 17, color: T.text },
  retryBtn:  { backgroundColor: T.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryTxt:  { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: T.surfaceSubtle, alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: T.text },
  emptySub:   {
    fontFamily: "Inter_400Regular", fontSize: 14,
    color: T.textMuted, textAlign: "center", lineHeight: 20, maxWidth: 260,
  },
});

// ─── Root Screen ─────────────────────────────────────────────────────────────

export default function TrackScreen() {
  const { bottomPadding: tabBarHeight } = useTabBarMetrics();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<InnerTab>(
    params.tab === "documents" ? "documents" : "journey"
  );

  useFocusEffect(
    useCallback(() => {
      if (params.tab === "documents") setActiveTab("documents");
    }, [params.tab])
  );

  return (
    <View style={root.container}>
      <GuestHeader title="Track" />
      <NextActionCard />
      <SegmentedControl active={activeTab} onChange={setActiveTab} />

      {activeTab === "journey" ? (
        <ScrollView
          style={root.scroll}
          contentContainerStyle={[root.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <JourneyTab />
        </ScrollView>
      ) : (
        <View style={root.docsFlex}>
          <DocumentsTab tabBarHeight={tabBarHeight} />
        </View>
      )}
    </View>
  );
}

const root = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: T.sp16 },
  docsFlex: { flex: 1 },
});
