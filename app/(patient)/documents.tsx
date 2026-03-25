import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { openPdf } from "@/services/files/FileService";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl, queryClient as qc } from "@/lib/query-client";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useGuestDocuments, PatientDocument } from "@/hooks/guest/useGuestDocuments";
import { T, cardShadow } from "@/constants/adminTheme";

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

function DocStatusPill({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: T.inactiveBg, text: T.textSec };
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text style={[styles.pillText, { color: colors.text }]}>
        {STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

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
      formData.append("file", {
        uri: file.uri,
        name: file.name || "document.pdf",
        type: "application/pdf",
      });

      const res = await fetch(
        `${getApiUrl()}v1/patient/documents/${doc.id}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );
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

  async function handleOpenPdf() {
    if (!accessToken) return;
    try {
      setOpening(true);
      const resp = await fetch(
        `${getApiUrl()}v1/documents/${doc.id}/signed-url`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
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

  const canUpload = doc.status === "ASSIGNED";
  const canOpen =
    doc.fileUrl && ["UPLOADED", "APPROVED"].includes(doc.status);

  return (
    <View style={[styles.docCard, cardShadow]}>
      <View style={styles.docRow}>
        <View style={styles.docIconWrap}>
          <Ionicons name="document-text-outline" size={20} color={T.accent} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>
            {doc.documentType.name}
          </Text>
          {doc.instructionText ? (
            <Text style={styles.docInstruction} numberOfLines={2}>
              {doc.instructionText}
            </Text>
          ) : null}
        </View>
        <DocStatusPill status={doc.status} />
      </View>

      {doc.status === "REJECTED" && doc.rejectionReason ? (
        <View style={styles.rejectionBox}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={T.danger}
          />
          <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>
        </View>
      ) : null}

      {canUpload || canOpen ? (
        <View style={styles.docActions}>
          {canUpload && (
            <Pressable
              style={[styles.actionBtn, styles.uploadBtn]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
                  <Text style={styles.uploadBtnText}>Upload PDF</Text>
                </>
              )}
            </Pressable>
          )}
          {canOpen && (
            <Pressable
              style={[styles.actionBtn, styles.openBtn]}
              onPress={handleOpenPdf}
              disabled={opening}
            >
              {opening ? (
                <ActivityIndicator size="small" color={T.accent} />
              ) : (
                <>
                  <Ionicons
                    name="open-outline"
                    size={15}
                    color={T.accent}
                  />
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

export default function DocumentsScreen() {
  const { accessToken } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const { isLoading, isError, refetch, documents, pendingCount, totalCount } =
    useGuestDocuments();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    refetch();
    setTimeout(() => setRefreshing(false), 800);
  }

  function handleRefresh() {
    qc.invalidateQueries({ queryKey: ["/v1/patient/dashboard"] });
  }

  if (isLoading) {
    return (
      <View style={styles.root}>
        <GuestHeader
          title="Documents"
          subtitle={undefined}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={styles.centerText}>Loading documents…</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.root}>
        <GuestHeader title="Documents" />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={T.danger} />
          <Text style={styles.errorTitle}>Couldn't load documents</Text>
          <Pressable onPress={onRefresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <GuestHeader
        title="Documents"
        subtitle={
          totalCount > 0
            ? `${totalCount} document${totalCount !== 1 ? "s" : ""}${pendingCount > 0 ? ` · ${pendingCount} pending` : ""}`
            : undefined
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.accent}
          />
        }
      >
        {documents.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name="document-text-outline"
                size={40}
                color={T.textMuted}
              />
            </View>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyBody}>
              Your clinic will assign documents for you to upload here.
            </Text>
          </View>
        ) : (
          <>
            {pendingCount > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Upload</Text>
                <View style={[styles.badge, { backgroundColor: T.warningBg }]}>
                  <Text style={[styles.badgeText, { color: T.warning }]}>
                    {pendingCount}
                  </Text>
                </View>
              </View>
            )}
            {documents.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                accessToken={accessToken}
                onRefresh={handleRefresh}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 10,
  },
  center: {
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
  errorTitle: {
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  docCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 14,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    marginTop: 10,
    padding: 10,
    backgroundColor: T.dangerBg,
    borderRadius: 8,
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
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
  emptyBox: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.inactiveBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
});
