import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ViewToken,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import type { AdminDashboardData } from "@/lib/api/adminDashboard";
import { goToInvoices, goToClinics } from "@/services/navigation/filteredNavigation";

interface Slide {
  id: string;
  gradient: readonly [string, string];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  kpis: { label: string; value: string | number; color: string }[];
  ctaText: string;
  onCta: () => void;
}

function buildSlides(data: AdminDashboardData): Slide[] {
  return [
    {
      id: "billing",
      gradient: ["#0A2E50", "#0F4C81"] as const,
      icon: "document-text-outline",
      title: "Billing Overview",
      subtitle: "Invoice status across all clinics",
      kpis: [
        { label: "Pending", value: data.invoices.pending, color: "#FBBF24" },
        { label: "Unpaid", value: data.invoices.unpaid, color: "#F87171" },
        { label: "Paid", value: data.invoices.paid, color: "#34D399" },
      ],
      ctaText: data.invoices.unpaid > 0 ? "View Unpaid Invoices" : "All Invoices",
      onCta: () =>
        data.invoices.unpaid > 0
          ? goToInvoices({ status: "UNPAID" })
          : goToInvoices(),
    },
    {
      id: "clinics",
      gradient: ["#0D3B6E", "#0A3D62"] as const,
      icon: "business-outline",
      title: "Clinics Status",
      subtitle: "Platform-wide clinic overview",
      kpis: [
        { label: "Total", value: data.clinics.total, color: "#93C5FD" },
        { label: "Active", value: data.clinics.active, color: "#34D399" },
        { label: "Suspended", value: data.clinics.suspended, color: "#F87171" },
      ],
      ctaText: data.clinics.suspended > 0 ? "View Suspended Clinics" : "All Clinics",
      onCta: () =>
        data.clinics.suspended > 0
          ? goToClinics({ status: "SUSPENDED" })
          : goToClinics(),
    },
    {
      id: "period",
      gradient: ["#062A4E", "#0A3D62"] as const,
      icon: "calendar-outline",
      title: `${data.currentPeriod} Snapshot`,
      subtitle: "Current billing period totals",
      kpis: [
        {
          label: "Billed",
          value: `$${data.invoices.totalBilledThisMonth.toLocaleString()}`,
          color: "#67E8F9",
        },
        { label: "Paid", value: data.invoices.paid, color: "#34D399" },
        {
          label: "Clinics",
          value: data.clinics.active,
          color: "#93C5FD",
        },
      ],
      ctaText: "View This Month",
      onCta: () => goToInvoices({ period: data.currentPeriod }),
    },
  ];
}

function SlideCard({ slide, width }: { slide: Slide; width: number }) {
  return (
    <LinearGradient colors={slide.gradient} style={[styles.slide, { width }]}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name={slide.icon} size={17} color="rgba(255,255,255,0.9)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.sub}>{slide.subtitle}</Text>
          </View>
        </View>

        <View style={styles.kpis}>
          {slide.kpis.map((k) => (
            <View key={k.label} style={styles.kpiItem}>
              <Text style={[styles.kpiVal, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel}>{k.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.8 : 1 }]}
          onPress={slide.onCta}
        >
          <Text style={styles.ctaText}>{slide.ctaText}</Text>
          <Ionicons name="arrow-forward" size={13} color={T.primary} />
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function SkeletonSlide({ width }: { width: number }) {
  return (
    <View style={[styles.slide, { width, backgroundColor: "#D1D9E6" }]}>
      <ActivityIndicator color={T.accent} style={{ marginTop: 60 }} />
    </View>
  );
}

interface Props {
  data: AdminDashboardData | undefined;
  isLoading: boolean;
}

export function BannerCarousel({ data, isLoading }: Props) {
  const { width } = useWindowDimensions();
  const [activeSlide, setActiveSlide] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const slides = data ? buildSlides(data) : [];

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
        <SkeletonSlide width={width} />
      ) : (
        <FlatList
          ref={flatRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderItem={({ item }) => <SlideCard slide={item} width={width} />}
        />
      )}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, i === activeSlide && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  slide: { height: 210, justifyContent: "flex-end" },
  inner: { padding: 20, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: T.r10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
    lineHeight: 22,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  kpis: { flexDirection: "row", gap: 22 },
  kpiItem: { gap: 1 },
  kpiVal: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 26 },
  kpiLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10.5,
    color: "rgba(255,255,255,0.55)",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.r20,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12.5,
    color: T.primary,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: T.bg,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.border },
  dotActive: { width: 18, backgroundColor: T.accent },
});
