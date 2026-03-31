import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T } from "@/constants/adminTheme";
import type { PendingGuestDocSummary } from "@/hooks/useManagerDashboard";

const SCREEN_W = Dimensions.get("window").width;
const GUTTER = T.sp16;
const COL_GAP = 8;
const NUM_COLS = 3;
const CARD_W = (SCREEN_W - GUTTER * 2 - COL_GAP * (NUM_COLS - 1)) / NUM_COLS;

interface Props {
  items: PendingGuestDocSummary[];
  isLoading: boolean;
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { width: CARD_W }]}>
      <View style={styles.skeletonAvatar} />
      <View style={[styles.skeletonLine, { width: "80%", height: 10, marginTop: 6 }]} />
      <View style={[styles.skeletonLine, { width: "50%", height: 8, marginTop: 4 }]} />
      <View style={[styles.skeletonBadge]} />
    </View>
  );
}

function GuestDocCard({ item }: { item: PendingGuestDocSummary }) {
  const urgency = item.pending >= 3 ? "high" : item.pending === 2 ? "medium" : "low";
  const borderColor =
    urgency === "high"
      ? T.danger + "55"
      : urgency === "medium"
      ? T.warning + "55"
      : T.border;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { width: CARD_W, borderColor, opacity: pressed ? 0.78 : 1 },
      ]}
      onPress={() => router.push(`/(manager)/patients/${item.patientId}`)}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                urgency === "high"
                  ? T.danger + "18"
                  : urgency === "medium"
                  ? T.warning + "18"
                  : T.accent + "14",
            },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              {
                color:
                  urgency === "high"
                    ? T.danger
                    : urgency === "medium"
                    ? T.warning
                    : T.accent,
              },
            ]}
          >
            {item.patientName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.countBadge,
            {
              backgroundColor:
                urgency === "high"
                  ? T.danger
                  : urgency === "medium"
                  ? T.warning
                  : T.accent,
            },
          ]}
        >
          <Text style={styles.countText}>{item.pending}</Text>
        </View>
      </View>

      <Text style={styles.guestName} numberOfLines={1}>
        {item.patientName}
      </Text>

      <Text style={styles.pendingLabel}>
        {item.pending} pending
        {item.uploaded > 0 ? ` · ${item.uploaded} done` : ""}
      </Text>

      {item.pendingDocNames.slice(0, 2).map((name, idx) => (
        <View key={idx} style={styles.docChip}>
          <Ionicons name="document-text-outline" size={9} color={T.textMuted} />
          <Text style={styles.docChipText} numberOfLines={1}>
            {name}
          </Text>
        </View>
      ))}
      {item.pendingDocNames.length > 2 && (
        <Text style={styles.moreText}>
          +{item.pendingDocNames.length - 2} more
        </Text>
      )}
    </Pressable>
  );
}

export function PendingDocumentsSection({ items, isLoading }: Props) {
  if (isLoading) {
    return (
      <View style={styles.grid}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.allClearCard}>
        <View style={styles.allClearIconWrap}>
          <Ionicons name="checkmark-circle" size={24} color={T.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.allClearTitle}>All clear</Text>
          <Text style={styles.allClearSub}>No guests with pending documents</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <GuestDocCard key={item.patientId} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: COL_GAP,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 10,
    gap: 4,
    minHeight: 108,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#fff",
    lineHeight: 14,
  },
  guestName: {
    fontFamily: "Inter_600SemiBold" as any,
    fontSize: 12,
    color: T.text,
    lineHeight: 16,
  },
  pendingLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textMuted,
    lineHeight: 14,
  },
  docChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: T.surfaceSubtle,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 2,
  },
  docChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textSec,
    flexShrink: 1,
  },
  moreText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textMuted,
    marginTop: 2,
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
  allClearIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  skeletonAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.border,
  },
  skeletonLine: {
    backgroundColor: T.border,
    borderRadius: 4,
  },
  skeletonBadge: {
    width: 36,
    height: 18,
    borderRadius: 9,
    backgroundColor: T.border,
    marginTop: 6,
  },
});
