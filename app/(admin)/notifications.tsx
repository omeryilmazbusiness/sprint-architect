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
  Clipboard,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";

type RequestKind = "MANAGER_PASSWORD" | "GUEST_ACCESS_KEY";
type RequestStatus = "PENDING" | "COMPLETED" | "REJECTED";

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

function kindLabel(kind: RequestKind) {
  return kind === "MANAGER_PASSWORD" ? "Password Reset" : "New Access Key";
}

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
  const label = kind === "MANAGER_PASSWORD" ? "Temporary Password" : "New Access Key";

  function copy() {
    if (Clipboard?.setString) Clipboard.setString(credential);
    Alert.alert("Copied", `${label} copied to clipboard.`);
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
          <Text style={credStyles.title}>{label} Generated</Text>
          <Text style={credStyles.subtitle}>
            This credential was sent by email. Shown once — copy it now.
          </Text>

          <View style={credStyles.credBox}>
            <Text style={credStyles.credText}>{credential}</Text>
          </View>

          <View style={credStyles.actions}>
            <Pressable style={credStyles.copyBtn} onPress={copy}>
              <Ionicons name="copy-outline" size={16} color="#fff" />
              <Text style={credStyles.copyBtnText}>Copy</Text>
            </Pressable>
            <Pressable style={credStyles.doneBtn} onPress={onClose}>
              <Text style={credStyles.doneBtnText}>Done</Text>
            </Pressable>
          </View>

          <View style={credStyles.warningBox}>
            <Ionicons name="warning-outline" size={14} color="#B45309" />
            <Text style={credStyles.warningText}>
              This credential cannot be retrieved again after closing this window.
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function NotificationsScreen() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const [showAll, setShowAll] = useState(false);
  const [generatedCred, setGeneratedCred] = useState<{ kind: RequestKind; value: string } | null>(null);
  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<CredentialRequest[]>({
    queryKey: ["/v1/admin/notifications/credential-requests", showAll],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/v1/admin/notifications/credential-requests?status=${showAll ? "ALL" : "PENDING"}&limit=50`,
      );
      return res.json() as Promise<CredentialRequest[]>;
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (item: CredentialRequest) => {
      const res = await apiRequest("POST", `/v1/admin/credential-requests/${item.id}/resolve`, {
        action: "GENERATE_AND_SEND",
      });
      const payload = await res.json() as { success: boolean; oneTimePassword?: string; oneTimeAccessKey?: string };
      return { payload, item };
    },
    onSuccess: ({ payload, item }) => {
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/credential-requests"] });
      qc.invalidateQueries({ queryKey: ["/v1/admin/notifications/unread-count"] });
      setConfirmingItemId(null);
      const cred = payload.oneTimePassword ?? payload.oneTimeAccessKey;
      if (cred) setGeneratedCred({ kind: item.kind, value: cred });
    },
    onError: (err: any) => {
      setConfirmingItemId(null);
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
      setRejectingItemId(null);
    },
    onError: (err: any) => {
      setRejectingItemId(null);
      Alert.alert("Error", err.message || "Could not reject request.");
    },
  });

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const requests = data ?? [];

  function renderItem({ item }: { item: CredentialRequest }) {
    const isPending = item.status === "PENDING";
    const isConfirmingResolve = confirmingItemId === item.id;
    const isConfirmingReject = rejectingItemId === item.id;
    const isThisMutating =
      (resolveMutation.isPending && confirmingItemId === item.id) ||
      (rejectMutation.isPending && rejectingItemId === item.id);
    const anyMutating = resolveMutation.isPending || rejectMutation.isPending;

    return (
      <View style={[styles.card, cardShadow]}>
        <View style={styles.cardTop}>
          <View style={[styles.kindBadge, { backgroundColor: kindColor(item.kind) + "18" }]}>
            <Ionicons name={kindIcon(item.kind)} size={12} color={kindColor(item.kind)} />
            <Text style={[styles.kindText, { color: kindColor(item.kind) }]}>
              {kindLabel(item.kind)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? "#FEF3C7" : item.status === "COMPLETED" ? "#DCFCE7" : "#FEE2E2" }]}>
            <Text style={[styles.statusText, { color: isPending ? "#92400E" : item.status === "COMPLETED" ? "#166534" : "#991B1B" }]}>
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
              <Text style={styles.infoText}>Sent to: {item.sentToEmail}</Text>
            </View>
          )}
        </View>

        {isPending && !isConfirmingResolve && !isConfirmingReject && (
          <View style={styles.cardActions}>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnReject, { opacity: anyMutating ? 0.5 : 1 }]}
              onPress={() => setRejectingItemId(item.id)}
              disabled={anyMutating}
              testID={`reject-btn-${item.id}`}
            >
              <Ionicons name="close-outline" size={15} color="#DC2626" />
              <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Reject</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnGenerate, { opacity: anyMutating ? 0.5 : 1 }]}
              onPress={() => setConfirmingItemId(item.id)}
              disabled={anyMutating}
              testID={`generate-btn-${item.id}`}
            >
              <Ionicons name="flash-outline" size={15} color="#fff" />
              <Text style={[styles.actionBtnText, { color: "#fff" }]}>Generate & Send</Text>
            </Pressable>
          </View>
        )}

        {isPending && isConfirmingResolve && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmWarning}>
              This will generate a new {kindLabel(item.kind).toLowerCase()} and send it by email. The current credential will be invalidated.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnReject, { flex: 1 }]}
                onPress={() => setConfirmingItemId(null)}
                disabled={isThisMutating}
                testID={`cancel-resolve-${item.id}`}
              >
                <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnGenerate, { flex: 1, opacity: isThisMutating ? 0.6 : 1 }]}
                onPress={() => resolveMutation.mutate(item)}
                disabled={isThisMutating}
                testID={`confirm-generate-${item.id}`}
              >
                {isThisMutating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={15} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: "#fff" }]}>Confirm</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {isPending && isConfirmingReject && (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmWarning}>
              Reject this credential request? The person will need to submit a new one.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.actionBtn, styles.actionBtnReject, { flex: 1 }]}
                onPress={() => setRejectingItemId(null)}
                disabled={isThisMutating}
                testID={`cancel-reject-${item.id}`}
              >
                <Text style={[styles.actionBtnText, { color: "#DC2626" }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { flex: 1, backgroundColor: "#DC2626", opacity: isThisMutating ? 0.6 : 1 }]}
                onPress={() => rejectMutation.mutate(item.id)}
                disabled={isThisMutating}
                testID={`confirm-reject-${item.id}`}
              >
                {isThisMutating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.actionBtnText, { color: "#fff" }]}>Reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AdminHeader
        title="Notifications"
        userEmail={user?.email}
        onLogout={handleLogout}
        backButton
        onBack={() => router.back()}
      />

      <View style={styles.toolbar}>
        <Pressable
          style={[styles.filterToggle, !showAll && styles.filterToggleActive]}
          onPress={() => setShowAll(false)}
        >
          <Text style={[styles.filterToggleText, !showAll && styles.filterToggleTextActive]}>
            Pending
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterToggle, showAll && styles.filterToggleActive]}
          onPress={() => setShowAll(true)}
        >
          <Text style={[styles.filterToggleText, showAll && styles.filterToggleTextActive]}>
            All
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={T.danger} />
          <Text style={styles.emptyText}>Failed to load notifications.</Text>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={40} color={T.textMuted} />
          <Text style={styles.emptyText}>
            {showAll ? "No credential requests found." : "No pending requests."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={T.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
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
  toolbar: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  filterToggle: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
  },
  filterToggleActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  filterToggleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  filterToggleTextActive: { color: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 15, color: T.textMuted, textAlign: "center" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
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
  kindText: { fontFamily: "Inter_600SemiBold", fontSize: 11.5 },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 10.5 },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 13, color: T.textSec, flex: 1 },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnReject: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  actionBtnGenerate: {
    backgroundColor: T.primary,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  confirmBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  confirmWarning: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 8,
  },
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
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: T.text },
  subtitle: {
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_700Bold",
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
  copyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
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
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: T.text },
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
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
});
