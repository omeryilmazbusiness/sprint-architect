import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";

export interface AssignedDoc {
  id: string;
  typeId: string;
  typeName: string;
  instructionText: string | null;
  status: string;
}

interface Props {
  docs: AssignedDoc[];
  summary: { pending: number; uploaded: number };
  onAssign: () => void;
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

export function DocumentsAssignmentCard({ docs, summary, onAssign }: Props) {
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
            {docs.map((doc, idx) => (
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
                </View>
                <DocStatusPill status={doc.status} />
              </View>
            ))}
          </View>
        </>
      ) : (
        <Pressable onPress={onAssign} style={styles.emptyState}>
          <Ionicons name="document-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>No documents assigned</Text>
          <Text style={styles.emptyHint}>Tap Add to assign document types</Text>
        </Pressable>
      )}
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
    gap: 12,
    backgroundColor: T.surface,
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
});
