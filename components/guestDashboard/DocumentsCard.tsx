import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { PatientDocument } from "@/hooks/guest/useGuestDashboard";

const DOC_STATUS: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  ASSIGNED: { label: "Pending", bg: T.warningBg, text: T.warning, icon: "time-outline" },
  UPLOADED: { label: "Under Review", bg: T.successBg, text: T.success, icon: "cloud-done-outline" },
  APPROVED: { label: "Approved", bg: T.successBg, text: T.success, icon: "checkmark-circle-outline" },
  REJECTED: { label: "Rejected", bg: T.dangerBg, text: T.danger, icon: "close-circle-outline" },
};

interface Props {
  documents: PatientDocument[];
}

export function DocumentsCard({ documents }: Props) {
  const pending = documents.filter((d) => d.status === "ASSIGNED" || d.status === "REJECTED").length;
  const uploaded = documents.filter((d) => d.status === "UPLOADED" || d.status === "APPROVED").length;
  const preview = documents.slice(0, 2);

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <Ionicons name="documents-outline" size={16} color={T.accent} />
        <Text style={styles.label}>Documents</Text>
      </View>

      {documents.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="documents-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>No documents assigned</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.countsRow}>
            <View style={[styles.countBox, { backgroundColor: T.warningBg }]}>
              <Text style={[styles.countNum, { color: T.warning }]}>{pending}</Text>
              <Text style={[styles.countLbl, { color: T.warning }]}>Pending</Text>
            </View>
            <View style={[styles.countBox, { backgroundColor: T.successBg }]}>
              <Text style={[styles.countNum, { color: T.success }]}>{uploaded}</Text>
              <Text style={[styles.countLbl, { color: T.success }]}>Uploaded</Text>
            </View>
            <View style={[styles.countBox, { backgroundColor: T.inactiveBg }]}>
              <Text style={[styles.countNum, { color: T.textSec }]}>{documents.length}</Text>
              <Text style={[styles.countLbl, { color: T.textSec }]}>Total</Text>
            </View>
          </View>

          {preview.map((doc) => {
            const cfg = DOC_STATUS[doc.status] ?? DOC_STATUS.ASSIGNED;
            return (
              <View key={doc.id} style={styles.docRow}>
                <Ionicons name={cfg.icon as any} size={16} color={cfg.text} />
                <Text style={styles.docName} numberOfLines={1} ellipsizeMode="tail">
                  {doc.documentType?.name ?? "Document"}
                </Text>
                <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.pillText, { color: cfg.text }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })}
          {documents.length > 2 ? (
            <Text style={styles.moreText}>+{documents.length - 2} more — see Documents tab</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: T.sp12,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: "center",
    paddingVertical: T.sp16,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
  body: { gap: T.sp8 },
  countsRow: {
    flexDirection: "row",
    gap: T.sp8,
    marginBottom: T.sp4,
  },
  countBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: T.sp8,
    borderRadius: T.r10,
  },
  countNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  countLbl: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp8,
    paddingVertical: T.sp4,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  docName: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.text,
    flex: 1,
  },
  pill: {
    borderRadius: T.r20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  moreText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    textAlign: "center",
    marginTop: T.sp4,
  },
});
