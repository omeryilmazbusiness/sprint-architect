import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

export interface AssignedDoc {
  id: string;
  typeId: string;
  typeName: string;
  instructionText: string | null;
  status: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
}

interface Props {
  docs: AssignedDoc[];
  summary: { pending: number; uploaded: number };
  onAssign: () => void;
  onViewPdf?: (docId: string, fileName?: string | null) => void;
  onUpdateDocStatus?: (
    docId: string,
    status: "APPROVED" | "REJECTED",
    rejectionReason?: string
  ) => Promise<void> | void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  ASSIGNED: { label: "Pending", bg: T.warningBg, text: T.warning },
  UPLOADED: { label: "Uploaded", bg: "#EFF6FF", text: T.accent },
  APPROVED: { label: "Approved", bg: T.successBg, text: T.success },
  REJECTED: { label: "Rejected", bg: T.dangerBg, text: T.danger },
};

function DocStatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    bg: T.inactiveBg,
    text: T.textMuted,
  };
  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.pillText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

interface RejectModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}

function RejectReasonModal({ visible, onClose, onConfirm, isLoading }: RejectModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Document</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejection so the guest knows what to fix.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Image is blurry, wrong document…"
              placeholderTextColor={T.textMuted}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              maxLength={300}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  styles.modalBtnReject,
                  (!reason.trim() || isLoading) && { opacity: 0.5 },
                ]}
                onPress={handleConfirm}
                disabled={!reason.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnRejectText}>Reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function DocumentsAssignmentCard({
  docs,
  summary,
  onAssign,
  onViewPdf,
  onUpdateDocStatus,
}: Props) {
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = (doc: AssignedDoc) => {
    if (!onUpdateDocStatus) return;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Approve "${doc.typeName}"?`)) {
        void runUpdate(doc.id, "APPROVED");
      }
    } else {
      Alert.alert(
        "Approve Document",
        `Mark "${doc.typeName}" as approved?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            style: "default",
            onPress: () => void runUpdate(doc.id, "APPROVED"),
          },
        ]
      );
    }
  };

  const handleReject = (docId: string) => {
    setRejectTarget(docId);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget || !onUpdateDocStatus) return;
    await runUpdate(rejectTarget, "REJECTED", reason);
    setRejectTarget(null);
  };

  const runUpdate = async (
    docId: string,
    status: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    if (!onUpdateDocStatus) return;
    setActionLoading(docId);
    try {
      await onUpdateDocStatus(docId, status, reason);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectingDoc = docs.find((d) => d.id === rejectTarget);

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="document-text-outline" size={16} color={T.accent} />
          <Text style={styles.title}>Documents</Text>
        </View>
        <Pressable onPress={onAssign} style={styles.addBtn}>
          <Ionicons name="add" size={16} color={T.accent} />
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      {docs.length > 0 ? (
        <>
          <View style={styles.summaryRow}>
            {summary.pending > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: T.warningBg }]}>
                <Text style={[styles.summaryChipText, { color: T.warning }]}>
                  {summary.pending} Pending
                </Text>
              </View>
            )}
            {summary.uploaded > 0 && (
              <View style={[styles.summaryChip, { backgroundColor: T.successBg }]}>
                <Text style={[styles.summaryChipText, { color: T.success }]}>
                  {summary.uploaded} Uploaded
                </Text>
              </View>
            )}
            {summary.pending === 0 && summary.uploaded === 0 && (
              <View style={[styles.summaryChip, { backgroundColor: T.surfaceSubtle }]}>
                <Text style={[styles.summaryChipText, { color: T.textMuted }]}>
                  {docs.length} Assigned
                </Text>
              </View>
            )}
          </View>

          <View style={styles.docList}>
            {docs.map((doc, idx) => {
              const isUploaded = doc.status === "UPLOADED";
              const isActing = actionLoading === doc.id;
              return (
                <View
                  key={doc.id}
                  style={[
                    styles.docRow,
                    idx < docs.length - 1 && styles.docRowBorder,
                  ]}
                >
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>
                      {doc.typeName}
                    </Text>
                    {doc.instructionText ? (
                      <Text style={styles.docInstruction} numberOfLines={1}>
                        {doc.instructionText}
                      </Text>
                    ) : null}
                    {doc.uploadedAt ? (
                      <Text style={styles.docUploaded}>
                        Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.docActions}>
                    {doc.fileUrl && onViewPdf && (
                      <Pressable
                        onPress={() => onViewPdf(doc.id, doc.fileName)}
                        style={styles.viewBtn}
                        hitSlop={8}
                      >
                        <Ionicons name="document-outline" size={14} color={T.accent} />
                        <Text style={styles.viewBtnText}>PDF</Text>
                      </Pressable>
                    )}
                    {isUploaded && onUpdateDocStatus && !isActing && (
                      <>
                        <Pressable
                          onPress={() => handleApprove(doc)}
                          style={styles.approveBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="checkmark" size={13} color={T.success} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleReject(doc.id)}
                          style={styles.rejectBtn}
                          hitSlop={8}
                        >
                          <Ionicons name="close" size={13} color={T.danger} />
                        </Pressable>
                      </>
                    )}
                    {isActing && <ActivityIndicator size="small" color={T.accent} />}
                    <DocStatusPill status={doc.status} />
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Pressable onPress={onAssign} style={styles.emptyState}>
          <Ionicons name="document-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>No documents assigned</Text>
          <Text style={styles.emptyHint}>Tap Add to assign document types</Text>
        </Pressable>
      )}

      <RejectReasonModal
        visible={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        isLoading={actionLoading === rejectTarget}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp20,
    marginBottom: T.sp12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp16,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: T.text,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
  },
  addBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.accent,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: T.sp12,
  },
  summaryChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  summaryChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  docList: {
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: T.sp16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: T.surface,
  },
  docActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.accent,
    backgroundColor: "#EFF6FF",
  },
  viewBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
  },
  approveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.successBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.success + "40",
  },
  rejectBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.danger + "40",
  },
  docUploaded: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.success,
    marginTop: 2,
  },
  docRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  docInfo: {
    flex: 1,
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
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: T.sp24,
    gap: 6,
  },
  emptyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.textSec,
  },
  emptyHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    gap: 12,
  },
  modalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
  },
  modalSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textMuted,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnCancel: {
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
  },
  modalBtnCancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.text,
  },
  modalBtnReject: {
    backgroundColor: T.danger,
  },
  modalBtnRejectText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
});
