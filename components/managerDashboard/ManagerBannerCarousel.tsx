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
import { BannerSlide, type BannerSlideData } from "@/components/adminDashboard/BannerSlide";
import type { ManagerDashboardData } from "@/hooks/useManagerDashboard";

const P = {
  orange: "#FF8A3D",
  blue: "#2F6BFF",
  teal: "#0EA5A0",
  green: "#2ECF8F",
  crimson: "#E3485B",
  navy: "#0A3D62",
  navyLight: "#1D6FA4",
  indigo: "#4F46E5",
} as const;

function isLaunchState(data: ManagerDashboardData): boolean {
  return (
    data.kpis.activeGuests === 0 &&
    data.kpis.appointmentsToday === 0 &&
    data.kpis.pendingDocuments === 0 &&
    data.monthAppointments.length === 0
  );
}

function buildSlides(data: ManagerDashboardData): BannerSlideData[] {
  const currentMonthLabel = new Date().toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  return [
    {
      id: "today",
      gradientColors: [P.orange, P.blue] as const,
      icon: "today-outline",
      title: "Today Overview",
      subtitle: "Live snapshot of today's activity",
      chips: [
        { label: "Appts Today", value: data.kpis.appointmentsToday },
        { label: "Pending Docs", value: data.kpis.pendingDocuments },
        { label: "Active Guests", value: data.kpis.activeGuests },
      ],
      ctaText: "View Today",
      onCta: () => router.push("/(manager-tabs)/users"),
    },
    {
      id: "ops",
      gradientColors: [P.indigo, P.teal] as const,
      icon: "construct-outline",
      title: "Operations Health",
      subtitle: "Missing plans & upcoming schedule",
      chips: [
        { label: "Missing Plans", value: data.kpis.missingAssignments },
        { label: "Next 7 Days", value: data.upcomingNext7Days },
      ],
      ctaText: "Fix Missing",
      onCta: () => router.push("/(manager-tabs)/users"),
    },
    {
      id: "month",
      gradientColors: [P.green, P.crimson] as const,
      icon: "calendar-outline",
      title: currentMonthLabel,
      subtitle: "Monthly schedule snapshot",
      chips: [
        { label: "Arriving", value: data.arrivingThisMonth },
        { label: "Appts", value: data.monthAppointments.length },
      ],
      ctaText: "Open Schedule",
      onCta: () => router.push("/(manager-tabs)/users"),
    },
  ];
}

function buildLaunchSlide(): BannerSlideData {
  return {
    id: "launch",
    gradientColors: [P.navy, P.navyLight] as const,
    icon: "rocket-outline",
    title: "System Ready",
    subtitle: "Create your first guest to start tracking.",
    chips: [
      { label: "Guests", value: 0 },
      { label: "Appointments", value: 0 },
    ],
    ctaText: "New Guest",
    onCta: () =>
      router.push({ pathname: "/(manager-tabs)/users", params: { openCreate: "1" } }),
  };
}

function SkeletonBanner({ width, height }: { width: number; height: number }) {
  return (
    <View style={[styles.skeleton, { width, height }]}>
      <ActivityIndicator color={T.accent} />
    </View>
  );
}

interface Props {
  data: ManagerDashboardData;
  isLoading: boolean;
}

export function ManagerBannerCarousel({ data, isLoading }: Props) {
  const { width, height: screenHeight } = useWindowDimensions();
  const bannerHeight = Math.min(260, Math.max(180, screenHeight * 0.30));

  const [activeSlide, setActiveSlide] = useState(0);
  const flatRef = useRef<FlatList<BannerSlideData>>(null);

  const slides: BannerSlideData[] = isLaunchState(data)
    ? [buildLaunchSlide()]
    : buildSlides(data);

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
        renderItem={({ item }) => <BannerSlide slide={item} height={bannerHeight} />}
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
