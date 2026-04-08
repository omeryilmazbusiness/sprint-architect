import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Platform,
  Text,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { GUEST_BANNERS } from "@/constants/guestBanners";
import { T } from "@/constants/adminTheme";
import type { ManagerDashboardData } from "@/hooks/useManagerDashboard";
import { useT } from "@/hooks/useT";
import type { ManagerBannerDict } from "@/i18n/types";

// ─── Sizing (mirrors GuestBannerCarousel exactly) ─────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_H = Math.min(Math.max(SCREEN_W * 0.52, 190), 270);
const CARD_MARGIN = T.sp16;
const CARD_W = SCREEN_W - CARD_MARGIN * 2;
const AUTO_SLIDE_MS = 5500;
const SLIDE_COUNT = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeGreeting(strings: ManagerBannerDict): string {
  const h = new Date().getHours();
  if (h < 12) return strings.greetingMorning;
  if (h < 17) return strings.greetingAfternoon;
  return strings.greetingEvening;
}

function monthLabel(): string {
  return new Date().toLocaleString("en", { month: "long", year: "numeric" });
}

// ─── Slide config ─────────────────────────────────────────────────────────────

interface StatItem {
  value: string | number;
  label: string;
}

interface SlideConfig {
  imageIndex: number;
  contextLabel: string;
  title: string;
  subtitle: string;
  stats: StatItem[];
}

function buildSlides(
  data: ManagerDashboardData,
  clinicName: string | undefined,
  strings: ManagerBannerDict,
): SlideConfig[] {
  return [
    {
      imageIndex: 0,
      contextLabel: strings.slide0Context,
      title: clinicName ?? "Dashboard",
      subtitle: timeGreeting(strings),
      stats: [
        { value: data.kpis.appointmentsToday, label: strings.statApptToday },
        { value: data.kpis.activeGuests, label: strings.statActiveGuests },
      ],
    },
    {
      imageIndex: 1,
      contextLabel: strings.slide1Context,
      title: strings.slide1Title,
      subtitle: strings.slide1Subtitle,
      stats: [
        { value: data.upcomingNext7Days, label: strings.statNext7Days },
        { value: data.kpis.missingAssignments, label: strings.statMissingPlans },
        { value: data.kpis.pendingDocuments, label: strings.statPendingDocs },
      ],
    },
    {
      imageIndex: 2,
      contextLabel: monthLabel(),
      title: strings.slide2Title,
      subtitle: strings.slide2Subtitle,
      stats: [
        { value: data.arrivingThisMonth, label: strings.statArriving },
        { value: data.monthAppointments.length, label: strings.statAppts },
      ],
    },
  ];
}

// ─── Stats mini-row ───────────────────────────────────────────────────────────

function StatsMini({ stats }: { stats: StatItem[] }) {
  return (
    <View style={ss.statsRow}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 ? <View style={ss.statDiv} /> : null}
          <View style={ss.statItem}>
            <Text style={ss.statNum}>{s.value}</Text>
            <Text style={ss.statLbl} numberOfLines={1}>{s.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Single slide ─────────────────────────────────────────────────────────────

function Slide({ slide }: { slide: SlideConfig }) {
  const src = GUEST_BANNERS[slide.imageIndex];
  return (
    <View style={ss.slide}>
      <Image source={src} style={ss.image} resizeMode="cover" />

      {/* Dark gradient — slightly deeper for text readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.82)"]}
        style={ss.overlay}
      />

      {/* Context label — top-left corner */}
      <View style={ss.contextBadge}>
        <Ionicons name="pulse-outline" size={10} color="rgba(255,255,255,0.8)" />
        <Text style={ss.contextText}>{slide.contextLabel}</Text>
      </View>

      {/* Caption — bottom left, mirrors guest banner layout */}
      <View style={ss.caption}>
        <Text style={ss.captionSub} numberOfLines={1}>{slide.subtitle}</Text>
        <Text style={ss.captionTitle} numberOfLines={1}>{slide.title}</Text>
        <StatsMini stats={slide.stats} />
      </View>
    </View>
  );
}

// ─── Skeleton loading state ───────────────────────────────────────────────────

function BannerSkeleton() {
  return (
    <View style={[ss.slide, ss.skeleton]}>
      <LinearGradient
        colors={["#1C2333", "#0D1117"]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  data: ManagerDashboardData;
  isLoading: boolean;
  clinicName?: string;
}

export function ManagerBannerCarousel({ data, isLoading, clinicName }: Props) {
  const t = useT();
  const strings = t.managerBanner;

  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScreenFocused = useRef(true);

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, SLIDE_COUNT - 1));
    scrollRef.current?.scrollTo({ x: clamped * CARD_W, animated: true });
    setActiveIndex(clamped);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isScreenFocused.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % SLIDE_COUNT;
        scrollRef.current?.scrollTo({ x: next * CARD_W, animated: true });
        return next;
      });
    }, AUTO_SLIDE_MS);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      isScreenFocused.current = true;
      startTimer();
      return () => {
        isScreenFocused.current = false;
        stopTimer();
      };
    }, [startTimer, stopTimer]),
  );

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<{ contentOffset: { x: number } }>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
      const clamped = Math.max(0, Math.min(idx, SLIDE_COUNT - 1));
      setActiveIndex(clamped);
      startTimer();
    },
    [startTimer],
  );

  const slides = buildSlides(data, clinicName, strings);

  return (
    <View style={ss.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_W}
        scrollEnabled={!isLoading}
      >
        {isLoading ? (
          <BannerSkeleton />
        ) : (
          slides.map((slide, i) => <Slide key={i} slide={slide} />)
        )}
      </ScrollView>

      {!isLoading && (
        <View style={ss.dots}>
          {slides.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                goTo(i);
                startTimer();
              }}
              hitSlop={10}
            >
              <View
                style={[
                  ss.dot,
                  i === activeIndex ? ss.dotActive : ss.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  // Outer wrapper — matches guest banner card: rounded, shadowed, margined
  wrapper: {
    marginHorizontal: CARD_MARGIN,
    marginBottom: T.sp20,
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
    }),
  },

  slide: {
    width: CARD_W,
    height: CARD_H,
  },
  image: {
    width: "100%",
    height: "100%",
  },

  // Gradient overlay: transparent → dark, over bottom 55% of card
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.72,
  },

  // Context badge — top-left corner
  contextBadge: {
    position: "absolute",
    top: T.sp12,
    left: T.sp12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  contextText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.3,
  },

  // Caption block — bottom area, same positioning as guest banner
  caption: {
    position: "absolute",
    bottom: 42,
    left: T.sp20,
    right: T.sp20,
    gap: 5,
  },
  captionSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  captionTitle: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: "#ffffff",
    letterSpacing: -0.3,
  },

  // Stats mini-row — below the title, inside caption
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    marginTop: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statItem: {
    alignItems: "center",
    gap: 1,
    paddingHorizontal: 2,
  },
  statNum: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: "#ffffff",
  },
  statLbl: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 9,
    color: "rgba(255,255,255,0.65)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statDiv: {
    width: 1,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginHorizontal: 10,
  },

  // Dots — floating at the very bottom of the card (overlaid on image, like guest)
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
  },
  dotActive: {
    width: 20,
    backgroundColor: "#fff",
  },
  dotInactive: {
    width: 5,
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  // Loading skeleton
  skeleton: {
    borderRadius: 0,
    overflow: "hidden",
  },
});
