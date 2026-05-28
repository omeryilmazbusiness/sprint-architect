import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useT } from "@/hooks/useT";
import { copyToClipboard } from "@/lib/clipboard";

type RequestKind = "MANAGER_PASSWORD" | "GUEST_ACCESS_KEY";
type RequestStatus = "PENDING" | "COMPLETED" | "REJECTED";
type NotifSeverity = "INFO" | "WARNING" | "CRITICAL";

interface CredentialRequest {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  clinicId: string | null;
  requesterEmail: string | null;
  targetUserId: string | null;
  targetPatientId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  sentToEmail: string | null;
  clinic: { id: string; name: string; contactEmail: string | null } | null;
  targetUser: { id: string; email: string } | null;
  targetPatient: { id: string; patientKey: string; fullName: string } | null;
}

interface SystemNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: NotifSeverity;
  status: "UNREAD" | "READ";
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
}

// ─── Pure helpers (no i18n needed) ────────────────────────────────────────────

function kindColor(kind: RequestKind) {
  return kind === "MANAGER_PASSWORD" ? T.primary : T.accent;
}
function kindIcon(kind: RequestKind): any {
  return kind === "MANAGER_PASSWORD" ? "lock-closed-outline" : "key-outline";
}
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
function severityColor(s: NotifSeverity) {
  if (s === "CRITICAL") return "#DC2626";
  if (s === "WARNING") return "#D97706";
  return T.accent;
}
function severityBg(s: NotifSeverity) {
  if (s === "CRITICAL") return "#FEF2F2";
  if (s === "WARNING") return "#FFFBEB";
  return "#EFF6FF";
}
function eventTypeIcon(type: string): any {
  if (type === "INVOICE_GENERATED" || type === "INVOICE_OVERDUE") return "document-text-outline";
  if (type === "CLINIC_SUSPENDED") return "ban-outline";
  if (type === "BILLING_JOB_FAILED" || type === "SCHEDULER_FAILED") return "flash-off-outline";
  if (type === "GUEST_CREATED") return "person-add-outline";
  if (type === "GUEST_APPROVED") return "checkmark-circle-outline";
  if (type === "GUEST_STATUS_CHANGED") return "person-outline";
  if (type === "DOCUMENT_UPLOADED") return "cloud-upload-outline";
  if (type === "DOCUMENT_APPROVED") return "checkmark-done-outline";
  if (type === "DOCUMENT_REJECTED") return "close-circle-outline";
  if (type === "APPOINTMENT_CREATED") return "calendar-outline";
  if (type === "APPOINTMENT_CANCELLED") return "calendar-clear-outline";
  return "notifications-outline";
}

// ─── CredentialModal ──────────────────────────────────────────────────────────

function CredentialModal({
  visible,
  kind,
  credential,
  onClose,
}: {
  visible: boolean;
  kind: RequestKind;
  credential: string;
  onClose: () => void;
}) {
  const t = useT();
  const tn = t.adminNotifications;
  const label = kind === "MANAGER_PASSWORD" ? tn.tempPasswordLabel : tn.newAccessKeyDisplayLabel;

  async function copy() {
    const ok = await copyToClipboard(credential);
    if (ok) Alert.alert(tn.copied, `${label} ${tn.copy}.`);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={credStyles.overlay} onPress={onClose}>
        <Pressable style={credStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={credStyles.iconWrap}>
            <Ionicons
              name={kind === "MANAGER_PASSWORD" ? "lock-open-outline" : "key-outline"}
              size={32}
              color={kindColor(kind)}
            />
          </View>
          <Text style={credStyles.title}>{label}</Text>
          <Text style={credStyles.subtitle}>{tn.credentialShownOnce}</Text>
          <View style={credStyles.credBox}>
            <Text style={credStyles.credText}>{credential}</Text>
          </View>
          <View style={credStyles.actions}>
            <Pressable style={credStyles.copyBtn} onPress={copy}>
              <Ionicons name="copy-outline" size={16} color="#fff" />
              <Text style={credStyles.copyBtnText}>{tn.copy}</Text>
            </Pressable>
            <Pressable style={credStyles.doneBtn} onPress={onClose}>
              <Text style={credStyles.doneBtnText}>{tn.done}</Text>
            </Pressable>
          </View>
          <View style={credStyles.warningBox}>
            <Ionicons name="warning-outline" size={14} color="#B45309" />
            <Text style={credStyles.warningText}>{tn.copyWarning}</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── CredentialRequestCard ────────────────────────────────────────────────────

function CredentialRequestCard({
  item,
  onResolve,
  onReject,
  isAnyMutating,
}: {
  item: CredentialRequest;
  onResolve: (item: CredentialRequest) => void;
  onReject: (id: string) => void;
  isAnyMutating: boolean;
}) {
  const t = useT();
  const tn = t.adminNotifications;
  const [confirmState, setConfirmState] = useState<"none" | "resolve" | "reject">("none");
  const [loading, setLoading] = useState(false);
  const isPending = item.status === "PENDING";

  const kindLabel = item.kind === "MANAGER_PASSWORD" ? tn.passwordResetLabel : tn.newAccessKeyLabel;

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.cardTop}>
        <View style={[styles.kindBadge, { backgroundColor: kindColor(item.kind) + "18" }]}>
          <Ionicons name={kindIcon(item.kind)} size={12} color={kindColor(item.kind)} />
          <Text style={[styles.kindText, { color: kindColor(item.kind) }]}>{kindLabel}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          {
            backgroundColor:
              isPending ? "#FEF3C7"
              : item.status === "COMPLETED" ? "#DCFCE7"
              : "#FEE2E2",
          },
        ]}>
          <Text style={[
            styles.statusText,
            {
              color:
                isPending ? "#92400E"
                : item.status === "COMPLETED" ? "#166534"
                : "#991B1B",
            },
          ]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={13} color={T.textMuted} />
          <Text style={styles.infoText}>
            {item.kind === "MANAGER_PASSWORD"
              ? item.targetUser?.email ?? item.requesterEmail ?? "Unknown user"
              : `${item.targetPatient?.fullName ?? "Unknown"} (${item.targetPatient?.patientKey ?? "—"})`}
          </Text>
        </View>
        {item.clinic && (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={13} color={T.textMuted} />
            <Text style={styles.infoText}>{item.clinic.name}</Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={13} color={T.textMuted} />
          <Text style={styles.infoText}>{formatTime(item.createdAt)}</Text>
        </View>
        {item.sentToEmail && !isPending && (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={13} color={T.textMuted} />
            <Text style={styles.infoText}>{tn.sentTo} {item.sentToEmail}</Text>
          </View>
        )}
      </View>

      {isPending && confirmState === "none" && (
        <View style={styles.cardActions}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnReject, { opacity: isAnyMutating ? 0.5 : 1 }]}
            onPress={() => setConfirmState("reject")}
            disabled={isAnyMutating}
          >
            <Ionicons name="close-outline" size={15} color="#DC2626" />
            <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>{tn.reject}</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnGenerate, { opacity: isAnyMutating ? 0.5 : 1 }]}
            onPress={() => setConfirmState("resolve")}
            disabled={isAnyMutating}
          >
            <Ionicons name="flash-outline" size={15} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>{tn.generateAndSend}</Text>
          </Pressable>
        </View>
      )}

      {isPending && confirmState === "resolve" && (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmWarning}>
            {tn.confirmGenerateText.replace("{type}", kindLabel.toLowerCase())}
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnReject, { flex: 1 }]}
              onPress={() => setConfirmState("none")}
              disabled={loading}
            >
              <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>{tn.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnGenerate, { flex: 1, opacity: loading ? 0.6 : 1 }]}
              onPress={() => { setLoading(true); onResolve(item); }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={15} color="#fff" />
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>{tn.confirm}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {isPending && confirmState === "reject" && (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmWarning}>{tn.confirmRejectText}</Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnReject, { flex: 1 }]}
              onPress={() => setConfirmState("none")}
              disabled={loading}
            >
              <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>{tn.cancel}</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { flex: 1, backgroundColor: "#DC2626", opacity: loading ? 0.6 : 1 }]}
              onPress={() => { setLoading(true); onReject(item.id); }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>{tn.reject}</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── SystemEventCard ──────────────────────────────────────────────────────────
// No translatable strings — title and body come from server data.

function SystemEventCard({
  item,
  onMarkRead,
}: {
  item: SystemNotification;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = item.status === "UNREAD";
  const sColor = severityColor(item.severity);
  const sBg = severityBg(item.severity);

  return (
    <Pressable
      style={[styles.card, cardShadow, isUnread && styles.cardUnread]}
      onPress={() => isUnread && onMarkRead(item.id)}
    >
      <View style={[styles.eventIconWrap, { backgroundColor: sBg }]}>
        <Ionicons name={eventTypeIcon(item.type)} size={20} color={sColor} />
      </View>

      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, !isUnread && styles.eventTitleRead]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.severityDot, { backgroundColor: sColor, opacity: isUnread ? 1 : 0 }]} />
        </View>

        <Text style={styles.eventBody} numberOfLines={2}>{item.body}</Text>

        <View style={styles.eventMeta}>
          <View style={[styles.severityTag, { backgroundColor: sBg, borderColor: sColor + "40" }]}>
            <Text style={[styles.severityTagText, { color: sColor }]}>{item.severity}</Text>
          </View>
          <Text style={styles.eventTime}>{formatTime(item.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const t = useT();
  const tn = t.adminNotifications;
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [activeTab, setActiveTab] = useState<"actions" | "events">("actions");
  const [showAll, setShowAll] = useState(false);
  const [generatedCred, setGeneratedCred] = useState<{ kind: RequestKind; value: string } | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const {
    data: credData,
    isLoading: credLoading,
    isError: credError,
    refetch: credRefetch,
    isRefetching: credRefetching,
  } = useQuery<CredentialRequest[]>({
    queryKey: ["/v1/admin/notifications/credential-requests", showAll],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/v1/admin/notifications/credential-requests?status=${showAll ? "ALL" : "PENDING"}&limit=50`,
      );
      return res.json() as Promise<CredentialRequest[]>;
    },
  });

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: eventsRefetch,
    isRefetching: eventsRefetching,
  } = useQuery<SystemNotification[]>({
    queryKey: ["/v1/admin/notifications/events"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/v1/admin/notifications/events?limit=50");
      return res.json() as Promise<SystemNotification[]>;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (item: CredentialRequest) => {
      const res = await apiRequest("POST", `/v1/admin/credential-requests/${item.id}/resolve`, {
        action: "GENERATE_AND_SEND",
      });
      const payload = await res.json() as {
        success: boolean;
        oneTimePassword?: string;
        oneTimeAccessKey?: string;
      };
      return { payload, item };
    },
    onSuccess: ({ payload, item }) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/credential-requests"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/unread-count"] });
      setMutatingId(null);
      const cred = payload.oneTimePassword ?? payload.oneTimeAccessKey;
      if (cred) setGeneratedCred({ kind: item.kind, value: cred });
    },
    onError: (err: any) => {
      setMutatingId(null);
      Alert.alert("Error", err.message || "Could not resolve request.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/v1/admin/credential-requests/${id}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/credential-requests"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/unread-count"] });
      setMutatingId(null);
    },
    onError: (err: any) => {
      setMutatingId(null);
      Alert.alert("Error", err.message || "Could not reject request.");
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/v1/admin/notifications/events/${id}/read`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/events"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/v1/admin/notifications/events/read-all", {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/events"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/unread-count"] });
    },
  });

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const events = eventsData ?? [];
  const hasUnreadEvents = events.some((e) => e.status === "UNREAD");
  const actionsTabCount = (credData ?? []).filter((r) => r.status === "PENDING").length;
  const eventsTabCount = events.filter((e) => e.status === "UNREAD").length;

  return (
    <View style={styles.root}>
      <AdminHeader
        title={tn.pageTitle}
        userEmail={user?.email}
        onLogout={handleLogout}
        backButton
        onBack={() => router.back()}
      />

      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === "actions" && styles.tabActive]}
          onPress={() => setActiveTab("actions")}
        >
          <Text style={[styles.tabText, activeTab === "actions" && styles.tabTextActive]}>
            {tn.tabActions}
          </Text>
          {actionsTabCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{actionsTabCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "events" && styles.tabActive]}
          onPress={() => setActiveTab("events")}
        >
          <Text style={[styles.tabText, activeTab === "events" && styles.tabTextActive]}>
            {tn.tabEvents}
          </Text>
          {eventsTabCount > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: "#DC2626" }]}>
              <Text style={styles.tabBadgeText}>{eventsTabCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {activeTab === "actions" && (
        <>
          <View style={styles.toolbar}>
            <Pressable
              style={[styles.filterToggle, !showAll && styles.filterToggleActive]}
              onPress={() => setShowAll(false)}
            >
              <Text style={[styles.filterToggleText, !showAll && styles.filterToggleTextActive]}>
                {tn.pending}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterToggle, showAll && styles.filterToggleActive]}
              onPress={() => setShowAll(true)}
            >
              <Text style={[styles.filterToggleText, showAll && styles.filterToggleTextActive]}>
                {tn.all}
              </Text>
            </Pressable>
          </View>

          {credLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={T.primary} size="large" />
            </View>
          ) : credError ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={40} color={T.danger} />
              <Text style={styles.emptyText}>{tn.loadingFailed}</Text>
            </View>
          ) : (credData ?? []).length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="notifications-off-outline" size={40} color={T.textMuted} />
              <Text style={styles.emptyText}>
                {showAll ? tn.noRequestsAll : tn.noRequestsPending}
              </Text>
            </View>
          ) : (
            <FlatList
              data={credData}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CredentialRequestCard
                  item={item}
                  isAnyMutating={resolveMutation.isPending || rejectMutation.isPending}
                  onResolve={(i) => {
                    setMutatingId(i.id);
                    resolveMutation.mutate(i);
                  }}
                  onReject={(id) => {
                    setMutatingId(id);
                    rejectMutation.mutate(id);
                  }}
                />
              )}
              contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
              refreshControl={
                <RefreshControl refreshing={credRefetching} onRefresh={credRefetch} tintColor={T.primary} />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {activeTab === "events" && (
        <>
          {hasUnreadEvents && (
            <View style={styles.toolbar}>
              <Pressable
                style={[styles.markAllBtn, markAllReadMutation.isPending && { opacity: 0.5 }]}
                onPress={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
              >
                <Ionicons name="checkmark-done-outline" size={14} color={T.primary} />
                <Text style={styles.markAllText}>{tn.markAllRead}</Text>
              </Pressable>
            </View>
          )}

          {eventsLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={T.primary} size="large" />
            </View>
          ) : eventsError ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={40} color={T.danger} />
              <Text style={styles.emptyText}>{tn.eventLoadingFailed}</Text>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="pulse-outline" size={40} color={T.textMuted} />
              <Text style={styles.emptyText}>{tn.noEvents}</Text>
              <Text style={styles.emptySubtext}>{tn.noEventsSubtext}</Text>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SystemEventCard
                  item={item}
                  onMarkRead={(id) => markReadMutation.mutate(id)}
                />
              )}
              contentContainerStyle={[styles.eventList, { paddingBottom: bottomPad + 24 }]}
              refreshControl={
                <RefreshControl refreshing={eventsRefetching} onRefresh={eventsRefetch} tintColor={T.primary} />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {generatedCred && (
        <CredentialModal
          visible
          kind={generatedCred.kind}
          credential={generatedCred.value}
          onClose={() => setGeneratedCred(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabBar: {
    flexDirection: "row",
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: T.primary },
  tabText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 14, color: T.textMuted },
  tabTextActive: { color: T.primary, fontFamily: "PlusJakartaSans_600SemiBold" },
  tabBadge: {
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: "center",
  },
  tabBadgeText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10, color: "#fff" },
  toolbar: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    alignItems: "center",
  },
  filterToggle: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
  },
  filterToggleActive: { backgroundColor: T.primary, borderColor: T.primary },
  filterToggleText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, color: T.textSec },
  filterToggleTextActive: { color: "#fff" },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.primary + "40",
    backgroundColor: T.primary + "10",
  },
  markAllText: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, color: T.primary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: T.textMuted, textAlign: "center" },
  emptySubtext: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.textMuted, textAlign: "center", lineHeight: 18 },
  list: { padding: 16, gap: 12 },
  eventList: { padding: 16, gap: 10 },
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  cardUnread: { borderColor: T.primary + "30", backgroundColor: "#F0F6FF" },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  kindBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  kindText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 11.5 },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10.5 },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 13, color: T.textSec, flex: 1 },
  cardActions: { flexDirection: "row", gap: 10, padding: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnReject: { backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" },
  actionBtnGenerate: { backgroundColor: T.primary },
  actionBtnText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 13 },
  confirmBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  confirmWarning: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12, color: "#92400E", lineHeight: 16 },
  confirmActions: { flexDirection: "row", gap: 8 },
  eventIconWrap: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  eventContent: {
    marginLeft: 60,
    paddingRight: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 4,
  },
  eventHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  eventTitle: { flex: 1, fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: T.text },
  eventTitleRead: { color: T.textSec },
  severityDot: { width: 7, height: 7, borderRadius: 3.5 },
  eventBody: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textSec,
    lineHeight: 18,
  },
  eventMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  severityTagText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 10 },
  eventTime: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 12, color: T.textMuted },
});

const credStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 12 },
      default: {},
    }),
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: T.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: T.text },
  subtitle: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.textSec,
    textAlign: "center",
    lineHeight: 18,
  },
  credBox: {
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
  },
  credText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: T.primary,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 10, width: "100%" },
  copyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  copyBtnText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: "#fff" },
  doneBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  doneBtnText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: T.text },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    padding: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningText: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
});
