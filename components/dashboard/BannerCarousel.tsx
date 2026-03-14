import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ViewToken,
  useWindowDimensions,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { AdminDashboardData } from "@/lib/api/adminDashboard";
import { goToInvoices, goToClinics } from "@/services/navigation/filteredNavigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Chip {
  label: string;
  value: string | number;
  color: string;
}

interface Slide {
  id: string;
  accentColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  chips: Chip[];
  ctaText: string;
  onCta: () => void;
}

// ─── Slide builder ───────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function buildSlides(data: AdminDashboardData): Slide[] {
  return [
    {
      id: "billing",
      accentColor: T.warning,
      icon: "receipt-outline",
      title: "Billing Overview",
      subtitle: "Invoice status across all clinics",
      chips: [
        { label: "Pending", value: data.invoices.pending, color: T.warning },
        { label: "Unpaid", value: data.invoices.unpaid, color: T.danger },
      ],
      ctaText: data.invoices.unpaid > 0 ? "View Unpaid" : "All Invoices",
      onCta: () =>
        data.invoices.unpaid > 0 ? goToInvoices({ status: "UNPAID" }) : goToInvoices(),
    },
    {
      id: "clinics",
      accentColor: T.primary,
      icon: "business-outline",
      title: "Clinics",
      subtitle: "Platform-wide clinic status",
      chips: [
        { label: "Active", value: data.clinics.active, color: "#16A34A" },
        { label: "Suspended", value: data.clinics.suspended, color: T.danger },
      ],
      ctaText: data.clinics.suspended > 0 ? "View Suspended" : "All Clinics",
      onCta: () =>
        data.clinics.suspended > 0
          ? goToClinics({ status: "SUSPENDED" })
          : goToClinics(),
    },
    {
      id: "period",
      accentColor: T.accent,
      icon: "calendar-outline",
      title: data.currentPeriod,
      subtitle: "Current billing period snapshot",
      chips: [
        {
          label: "Billed",
          value: fmtCurrency(data.invoices.totalBilledThisMonth),
          color: T.accent,
        },
        { label: "Paid", value: data.invoices.paid, color: "#16A34A" },
      ],
      ctaText: "View Period",
      onCta: () => goToInvoices({ period: data.currentPeriod }),
    },
  ];
}

function buildLaunchSlide(): Slide {
  return {
    id: "launch",
    accentColor: T.primary,
    icon: "rocket-outline",
    title: "System Ready",
    subtitle: "Your platform is live. Create your first clinic to get started.",
    chips: [
      { label: "Clinics", value: 0, color: T.primary },
      { label: "Invoices", value: 0, color: T.textMuted },
    ],
    ctaText: "Create First Clinic",
    onCta: () => router.push("/(admin)/clinics/create"),
  };
}

function isLaunchState(data: AdminDashboardData): boolean {
  return (
    data.clinics.total === 0 &&
    data.invoices.pending === 0 &&
    data.invoices.unpaid === 0 &&
    data.invoices.paid === 0
  );
}

// ─── Slide card ──────────────────────────────────────────────────────────────

function SlideCard({ slide, cardWidth }: { slide: Slide; cardWidth: number }) {
  return (
    <View style={[styles.slideOuter, { width: cardWidth }]}>
      <View style={[styles.card, cardShadow]}>
        <View style={[styles.accentBar, { backgroundColor: slide.accentColor }]} />

        <View style={styles.cardBody}>
          <View style={styles.headRow}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: slide.accentColor + "14" },
              ]}
            >
              <Ionicons name={slide.icon} size={16} color={slide.accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {slide.title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {slide.subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.chipsRow}>
            {slide.chips.map((chip) => (
              <View
                key={chip.label}
                style={[styles.chip, { backgroundColor: chip.color + "12" }]}
              >
                <Text style={[styles.chipValue, { color: chip.color }]}>
                  {chip.value}
                </Text>
                <Text style={[styles.chipLabel, { color: chip.color + "BB" }]}>
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: slide.accentColor, opacity: pressed ? 0.82 : 1 },
            ]}
            onPress={slide.onCta}
          >
            <Text style={styles.ctaText}>{slide.ctaText}</Text>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Skeleton slide ──────────────────────────────────────────────────────────

function SkeletonSlide({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={[styles.slideOuter, { width: cardWidth }]}>
      <View style={[styles.card, cardShadow]}>
        <View style={[styles.accentBar, { backgroundColor: T.border }]} />
        <View style={styles.cardBody}>
          <View style={styles.headRow}>
            <View style={[styles.iconWrap, { backgroundColor: T.border }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[styles.skelLine, { width: "55%", height: 14 }]} />
              <View style={[styles.skelLine, { width: "80%", height: 11 }]} />
            </View>
          </View>
          <View style={styles.chipsRow}>
            <View style={[styles.chip, { backgroundColor: T.border, width: 72 }]} />
            <View style={[styles.chip, { backgroundColor: T.border, width: 72 }]} />
          </View>
          <View style={[styles.skelLine, { width: 110, height: 32, borderRadius: T.r20 }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Banner carousel ─────────────────────────────────────────────────────────

interface Props {
  data: AdminDashboardData | undefined;
  isLoading: boolean;
}

export function BannerCarousel({ data, isLoading }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = width - 32;
  const [activeSlide, setActiveSlide] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const slides: Slide[] = data
    ? isLaunchState(data)
      ? [buildLaunchSlide()]
      : buildSlides(data)
    : [];

  const dotCount = isLoading ? 3 : Math.max(1, slides.length);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveSlide(viewableItems[0].index);
      }
    },
    [],
  );

  return (
    <View style={styles.wrap}>
      {isLoading ? (
        <View style={styles.skeletonRow}>
          <SkeletonSlide cardWidth={cardWidth} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={slides}
          horizontal
          pagingEnabled={false}
          snapToInterval={width}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => <SlideCard slide={item} cardWidth={cardWidth} />}
        />
      )}

      {dotCount > 1 && (
        <View style={styles.dots}>
          {Array.from({ length: dotCount }).map((_, i) => (
            <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  skeletonRow: { paddingHorizontal: 16 },
  listContent: { paddingHorizontal: 16, gap: 0 },

  slideOuter: { paddingRight: 0 },

  card: {
    backgroundColor: T.surface,
    borderRadius: T.r20,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  cardBody: {
    padding: 18,
    gap: 14,
  },

  headRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: T.text,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },

  chipsRow: { flexDirection: "row", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: T.r20,
  },
  chipValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  chipLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
  },

  cta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: T.r20,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
    paddingBottom: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.border },
  dotActive: { width: 18, backgroundColor: T.accent },

  skelLine: {
    backgroundColor: T.border,
    borderRadius: 6,
  },
});
