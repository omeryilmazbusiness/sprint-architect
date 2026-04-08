import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, cardShadow } from "@/constants/adminTheme";
import type { PendingGuestDocSummary } from "@/hooks/useManagerDashboard";
import { useT } from "@/hooks/useT";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = Math.min(260, SCREEN_W * 0.68);
const CARD_GAP = 10;

interface Props {
  items: PendingGuestDocSummary[];
  isLoading: boolean;
}

function urgencyOf(pending: number): "high" | "medium" | "low" {
  if (pending >= 3) return "high";
  if (pending === 2) return "medium";
  return "low";
}

function urgencyColor(u: "high" | "medium" | "low"): string {
  if (u === "high") return T.danger;
  if (u === "medium") return T.warning;
  return T.accent;
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { width: CARD_W }]}>
      <View style={styles.skeletonHeader} />
      <View style={[styles.skeletonLine, { width: "70%", height: 12, marginTop: 10 }]} />
      <View style={[styles.skeletonLine, { width: "45%", height: 10, marginTop: 6 }]} />
      <View style={styles.skeletonChipRow}>
        <View style={[styles.skeletonLine, { width: 70, height: 22, borderRadius: 6 }]} />
        <View style={[styles.skeletonLine, { width: 55, height: 22, borderRadius: 6 }]} />
      </View>
    </View>
  );
}

function GuestDocCard({ item, viewGuestLabel, pendingLabel, uploadedLabel }: {
  item: PendingGuestDocSummary;
  viewGuestLabel: string;
  pendingLabel: string;
  uploadedLabel: string;
}) {
  const u = urgencyOf(item.pending);
  const color = urgencyColor(u);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        { width: CARD_W, opacity: pressed ? 0.8 : 1 },
        u === "high" && styles.cardHigh,
        u === "medium" && styles.cardMed,
      ]}
      onPress={() => router.push(`/(manager)/patients/${item.patientId}`)}
    >
      {/* Top row: avatar + urgency badge */}
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: color + "18" }]}>
          <Text style={[styles.avatarInitial, { color }]}>
            {item.patientName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.urgencyGroup}>
          <View style={[styles.countBadge, { backgroundColor: color }]}>
            <Ionicons name="document-text" size={10} color="#fff" />
            <Text style={styles.countBadgeText}>{item.pending}</Text>
          </View>
          {item.uploaded > 0 && (
            <View style={[styles.uploadedBadge]}>
              <Ionicons name="cloud-upload-outline" size={10} color={T.success} />
              <Text style={styles.uploadedBadgeText}>{item.uploaded}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Guest name */}
      <Text style={styles.guestName} numberOfLines={1}>
        {item.patientName}
      </Text>

      {/* Summary line */}
      <Text style={styles.summaryLine}>
        <Text style={[styles.summaryBold, { color }]}>
          {pendingLabel.replace("{n}", String(item.pending))}
        </Text>
        {item.uploaded > 0 ? (
          <Text style={styles.summaryMuted}>
            {" · "}{uploadedLabel.replace("{n}", String(item.uploaded))}
          </Text>
        ) : null}
      </Text>

      {/* Doc name chips */}
      {item.pendingDocNames.length > 0 && (
        <View style={styles.chipRow}>
          {item.pendingDocNames.slice(0, 2).map((name, idx) => (
            <View key={idx} style={[styles.chip, { borderColor: color + "40" }]}>
              <Ionicons name="document-outline" size={10} color={color} />
              <Text style={[styles.chipText, { color }]} numberOfLines={1}>
                {name}
              </Text>
            </View>
          ))}
          {item.pendingDocNames.length > 2 && (
            <Text style={styles.moreChip}>
              +{item.pendingDocNames.length - 2} more
            </Text>
          )}
        </View>
      )}

      {/* CTA arrow */}
      <View style={styles.cta}>
        <Text style={[styles.ctaText, { color }]}>{viewGuestLabel}</Text>
        <Ionicons name="arrow-forward" size={12} color={color} />
      </View>
    </Pressable>
  );
}

export function PendingDocumentsSection({ items, isLoading }: Props) {
  const t = useT();
  const td = t.managerDashboard;

  if (isLoading) {
    return (
      <View style={styles.skeletonRow}>
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
          <Text style={styles.allClearTitle}>{td.pendingAllClear}</Text>
          <Text style={styles.allClearSub}>{td.pendingAllClearSub}</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList<PendingGuestDocSummary>
      data={items}
      keyExtractor={(item) => item.patientId}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_W + CARD_GAP}
      decelerationRate="fast"
      contentContainerStyle={styles.carouselContent}
      ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
      renderItem={({ item }) => (
        <GuestDocCard
          item={item}
          viewGuestLabel={td.pendingViewGuest}
          pendingLabel={td.pendingSummaryPending}
          uploadedLabel={td.pendingSummaryUploaded}
        />
      )}
      scrollEnabled={!!items.length}
    />
  );
}

const styles = StyleSheet.create({
  carouselContent: {
    paddingRight: T.sp16,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: CARD_GAP,
  },

  card: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 6,
  },
  cardHigh: {
    borderColor: T.danger + "50",
    backgroundColor: T.dangerBg,
  },
  cardMed: {
    borderColor: T.warning + "50",
    backgroundColor: T.warningBg,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
  },

  urgencyGroup: {
    alignItems: "flex-end",
    gap: 4,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 12,
    color: "#fff",
  },
  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: T.successBg,
    borderWidth: 1,
    borderColor: T.success + "40",
  },
  uploadedBadgeText: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 11,
    color: T.success,
  },

  guestName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: T.text,
    letterSpacing: -0.2,
    marginTop: 2,
  },
  summaryLine: {
    fontSize: 12,
    lineHeight: 16,
  },
  summaryBold: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 12,
  },
  summaryMuted: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: T.surface,
    maxWidth: CARD_W - 28,
  },
  chipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    flexShrink: 1,
  },
  moreChip: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 10,
    color: T.textMuted,
    alignSelf: "center",
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ctaText: {
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 11,
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
    fontFamily: "PlusJakartaSans_600SemiBold" as any,
    fontSize: 14,
    color: T.success,
  },
  allClearSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.success,
    marginTop: 2,
    opacity: 0.8,
  },

  skeletonHeader: {
    width: "100%",
    height: 38,
    borderRadius: 10,
    backgroundColor: T.border,
  },
  skeletonLine: {
    backgroundColor: T.border,
    borderRadius: 4,
  },
  skeletonChipRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
});
