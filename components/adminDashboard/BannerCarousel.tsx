import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ViewToken,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { T } from "@/constants/adminTheme";
import type { AdminDashboardData } from "@/lib/api/adminDashboard";
import { goToInvoices, goToClinics } from "@/services/navigation/filteredNavigation";
import { BannerSlide, type BannerSlideData } from "./BannerSlide";
import { useT } from "@/hooks/useT";
import type { AdminDashboardDict } from "@/i18n/types";

// ─── Palette ──────────────────────────────────────────────────────────────────

const P = {
  orange: "#FF8A3D",
  blue: "#2F6BFF",
  green: "#2ECF8F",
  crimson: "#E3485B",
  navyDark: "#0A2E50",
  navyMid: "#0A3D62",
  navyLight: "#1D6FA4",
} as const;

const CARD_H_RATIO = 0.32;
const CARD_H_MIN = 200;
const CARD_H_MAX = 270;
const SIDE_MARGIN = 16;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return n === 0 ? "$0" : `$${n.toLocaleString()}`;
}

function isLaunchState(data: AdminDashboardData): boolean {
  return (
    data.clinics.total === 0 &&
    data.invoices.pending === 0 &&
    data.invoices.unpaid === 0 &&
    data.invoices.paid === 0
  );
}

// ─── Slide builders ───────────────────────────────────────────────────────────

function buildSlides(data: AdminDashboardData, d: AdminDashboardDict): BannerSlideData[] {
  return [
    {
      id: "billing",
      gradientColors: [P.orange, P.blue] as const,
      icon: "receipt-outline",
      title: d.bannerBillingTitle,
      subtitle: d.bannerBillingSubtitle,
      chips: [
        { label: d.statusPending, value: data.invoices.pending },
        { label: d.statusUnpaid, value: data.invoices.unpaid },
      ],
      ctaText: data.invoices.unpaid > 0 ? d.bannerViewUnpaid : d.allInvoices,
      onCta: () =>
        data.invoices.unpaid > 0
          ? goToInvoices({ status: "UNPAID" })
          : goToInvoices(),
    },
    {
      id: "clinics",
      gradientColors: [P.blue, P.green] as const,
      icon: "business-outline",
      title: d.bannerClinicsTitle,
      subtitle: d.bannerClinicsSubtitle,
      chips: [
        { label: d.statusActive, value: data.clinics.active },
        { label: d.statusSuspended, value: data.clinics.suspended },
      ],
      ctaText: data.clinics.suspended > 0 ? d.bannerViewSuspended : d.allClinics,
      onCta: () =>
        data.clinics.suspended > 0
          ? goToClinics({ status: "SUSPENDED" })
          : goToClinics(),
    },
    {
      id: "period",
      gradientColors: [P.green, P.crimson] as const,
      icon: "calendar-outline",
      title: data.currentPeriod,
      subtitle: d.bannerPeriodSubtitle,
      chips: [
        {
          label: d.statusBilled,
          value: fmtCurrency(data.invoices.totalBilledThisMonth),
        },
        { label: d.statusPaid, value: data.invoices.paid },
      ],
      ctaText: d.bannerViewPeriod,
      onCta: () => goToInvoices({ period: data.currentPeriod }),
    },
  ];
}

function buildLaunchSlide(d: AdminDashboardDict): BannerSlideData {
  return {
    id: "launch",
    gradientColors: [P.navyDark, P.navyLight] as const,
    icon: "rocket-outline",
    title: d.bannerLaunchTitle,
    subtitle: d.bannerLaunchSubtitle,
    chips: [
      { label: d.statusClinics, value: 0 },
      { label: d.statusInvoices, value: 0 },
    ],
    ctaText: d.bannerLaunchCta,
    onCta: () => router.push("/(admin)/clinics/create"),
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBanner({ cardWidth, height }: { cardWidth: number; height: number }) {
  return (
    <View style={[styles.card, { width: cardWidth, height }]}>
      <View style={[StyleSheet.absoluteFill, styles.skeletonFill]}>
        <ActivityIndicator color={T.accent} />
      </View>
    </View>
  );
}

// ─── Banner Carousel ──────────────────────────────────────────────────────────

interface Props {
  data: AdminDashboardData | undefined;
  isLoading: boolean;
}

export function BannerCarousel({ data, isLoading }: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cardWidth = screenWidth - SIDE_MARGIN * 2;
  const bannerHeight = Math.min(CARD_H_MAX, Math.max(CARD_H_MIN, screenHeight * CARD_H_RATIO));

  const t = useT();
  const d = t.adminDashboard;

  const [activeSlide, setActiveSlide] = useState(0);
  const flatRef = useRef<FlatList<BannerSlideData>>(null);

  const slides: BannerSlideData[] = data
    ? isLaunchState(data)
      ? [buildLaunchSlide(d)]
      : buildSlides(data, d)
    : [];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveSlide(viewableItems[0].index);
      }
    },
    [],
  );

  if (isLoading) {
    return (
      <View style={styles.outerWrap}>
        <SkeletonBanner cardWidth={cardWidth} height={bannerHeight} />
      </View>
    );
  }

  const showDots = slides.length > 1;

  return (
    <View style={styles.outerWrap}>
      <View style={[styles.card, { width: cardWidth, height: bannerHeight }]}>
        <FlatList
          ref={flatRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => (
            <BannerSlide slide={item} height={bannerHeight} width={cardWidth} />
          )}
          getItemLayout={(_, index) => ({
            length: cardWidth,
            offset: cardWidth * index,
            index,
          })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
        />

        {showDots && (
          <View style={styles.dots} pointerEvents="none">
            {slides.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeSlide && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerWrap: {
    marginHorizontal: SIDE_MARGIN,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      },
      android: { elevation: 7 },
    }),
  },

  card: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#D1D9E6",
  },

  skeletonFill: {
    alignItems: "center",
    justifyContent: "center",
  },

  dots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.40)",
    width: 5,
  },
  dotActive: {
    width: 20,
    backgroundColor: "#fff",
  },
});
