import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ViewToken,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { T } from "@/constants/adminTheme";
import type { AdminDashboardData } from "@/lib/api/adminDashboard";
import { goToInvoices, goToClinics } from "@/services/navigation/filteredNavigation";
import { BannerSlide, type BannerSlideData } from "./BannerSlide";

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

function buildSlides(data: AdminDashboardData): BannerSlideData[] {
  return [
    {
      id: "billing",
      gradientColors: [P.orange, P.blue] as const,
      icon: "receipt-outline",
      title: "Billing Overview",
      subtitle: "Invoice status across all clinics",
      chips: [
        { label: "Pending", value: data.invoices.pending },
        { label: "Unpaid", value: data.invoices.unpaid },
      ],
      ctaText: data.invoices.unpaid > 0 ? "View Unpaid" : "All Invoices",
      onCta: () =>
        data.invoices.unpaid > 0
          ? goToInvoices({ status: "UNPAID" })
          : goToInvoices(),
    },
    {
      id: "clinics",
      gradientColors: [P.blue, P.green] as const,
      icon: "business-outline",
      title: "Clinics",
      subtitle: "Platform-wide clinic status",
      chips: [
        { label: "Active", value: data.clinics.active },
        { label: "Suspended", value: data.clinics.suspended },
      ],
      ctaText: data.clinics.suspended > 0 ? "View Suspended" : "All Clinics",
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
      subtitle: "Current billing period snapshot",
      chips: [
        {
          label: "Billed",
          value: fmtCurrency(data.invoices.totalBilledThisMonth),
        },
        { label: "Paid", value: data.invoices.paid },
      ],
      ctaText: "View Period",
      onCta: () => goToInvoices({ period: data.currentPeriod }),
    },
  ];
}

function buildLaunchSlide(): BannerSlideData {
  return {
    id: "launch",
    gradientColors: [P.navyDark, P.navyLight] as const,
    icon: "rocket-outline",
    title: "System Ready",
    subtitle: "Create your first clinic to get started.",
    chips: [
      { label: "Clinics", value: 0 },
      { label: "Invoices", value: 0 },
    ],
    ctaText: "Create First Clinic",
    onCta: () => router.push("/(admin)/clinics/create"),
  };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBanner({ width, height }: { width: number; height: number }) {
  return (
    <View style={[styles.skeleton, { width, height }]}>
      <ActivityIndicator color={T.accent} />
    </View>
  );
}

// ─── Banner Carousel ──────────────────────────────────────────────────────────

interface Props {
  data: AdminDashboardData | undefined;
  isLoading: boolean;
}

export function BannerCarousel({ data, isLoading }: Props) {
  const { width, height: screenHeight } = useWindowDimensions();
  const bannerHeight = Math.min(260, Math.max(180, screenHeight * 0.32));

  const [activeSlide, setActiveSlide] = useState(0);
  const flatRef = useRef<FlatList<BannerSlideData>>(null);

  const slides: BannerSlideData[] = data
    ? isLaunchState(data)
      ? [buildLaunchSlide()]
      : buildSlides(data)
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
      <View style={styles.wrap}>
        <SkeletonBanner width={width} height={bannerHeight} />
      </View>
    );
  }

  const showDots = slides.length > 1;

  return (
    <View style={styles.wrap}>
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
          <BannerSlide slide={item} height={bannerHeight} />
        )}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
      />

      {showDots && (
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeSlide && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },

  skeleton: {
    backgroundColor: "#D1D9E6",
    alignItems: "center",
    justifyContent: "center",
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: T.bg,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.border,
  },
  dotActive: {
    width: 18,
    backgroundColor: T.accent,
  },
});
