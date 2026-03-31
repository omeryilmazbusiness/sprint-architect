import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import type { PendingGuestDocSummary } from "@/hooks/useManagerDashboard";

interface Props {
  items: PendingGuestDocSummary[];
  isLoading: boolean;
}

function Skeleton() {
  return (
    <View style={styles.card}>
      <View style={[styles.skeletonLine, { width: "50%", height: 13, marginBottom: 8 }]} />
      <View style={[styles.skeletonLine, { width: "80%", height: 11 }]} />
    </View>
  );
}

export function PendingDocumentsSection({ items, isLoading }: Props) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        {[0, 1].map((i) => <Skeleton key={i} />)}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.allClearCard}>
        <View style={styles.allClearIcon}>
          <Ionicons name="checkmark-circle" size={22} color={T.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.allClearTitle}>All documents received</Text>
          <Text style={styles.allClearSub}>No guests with pending documents right now</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item) => (
        <Pressable
          key={item.patientId}
          style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => router.push(`/(manager)/patients/${item.patientId}`)}
        >
          <View style={styles.cardTop}>
            <View style={styles.guestInfo}>
              <View style={styles.avatarWrap}>
                <Text style={styles.avatarText}>
                  {item.patientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guestName} numberOfLines={1}>
                  {item.patientName}
                </Text>
                <View style={styles.chipsRow}>
                  {item.pending > 0 && (
                    <View style={styles.pendingChip}>
                      <Ionicons name="time-outline" size={11} color={T.warning} />
                      <Text style={styles.pendingChipText}>
                        {item.pending} pending
                      </Text>
                    </View>
                  )}
                  {item.uploaded > 0 && (
                    <View style={styles.uploadedChip}>
                      <Ionicons name="cloud-upload-outline" size={11} color={T.success} />
                      <Text style={styles.uploadedChipText}>
                        {item.uploaded} uploaded
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
          </View>

          {item.pendingDocNames.length > 0 && (
            <View style={styles.docNamesRow}>
              {item.pendingDocNames.slice(0, 3).map((name, idx) => (
                <View key={idx} style={styles.docNameTag}>
                  <Ionicons name="document-text-outline" size={10} color={T.warning} />
                  <Text style={styles.docNameText} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
              ))}
              {item.pendingDocNames.length > 3 && (
                <View style={[styles.docNameTag, styles.docNameTagMore]}>
                  <Text style={styles.docNameTextMore}>
                    +{item.pendingDocNames.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    padding: T.sp16,
    borderWidth: 1,
    borderColor: T.border,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  guestInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.warning + "22",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: T.warning,
  },
  guestName: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.text,
    marginBottom: 4,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: T.warningBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pendingChipText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 11,
    color: T.warning,
  },
  uploadedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: T.successBg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  uploadedChipText: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 11,
    color: T.success,
  },
  docNamesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  docNameTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.warningBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.r8,
    maxWidth: "48%" as any,
  },
  docNameTagMore: {
    backgroundColor: T.surfaceSubtle,
  },
  docNameText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: T.warning,
    flexShrink: 1,
  },
  docNameTextMore: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.textMuted,
  },
  allClearCard: {
    backgroundColor: T.successBg,
    borderRadius: T.r12,
    padding: T.sp16,
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    borderWidth: 1,
    borderColor: T.success + "30",
  },
  allClearIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  allClearTitle: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 14,
    color: T.success,
  },
  allClearSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.success,
    marginTop: 2,
    opacity: 0.8,
  },
  skeletonLine: {
    backgroundColor: T.border,
    borderRadius: 6,
  },
});
