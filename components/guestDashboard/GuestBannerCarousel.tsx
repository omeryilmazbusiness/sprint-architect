import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Platform,
  Text,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { GUEST_BANNERS } from "@/constants/guestBanners";
import { T } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_H = Math.min(Math.max(SCREEN_W * 0.5, 180), 260);
const CARD_MARGIN = T.sp16;
const CARD_W = SCREEN_W - CARD_MARGIN * 2;
const AUTO_SLIDE_MS = 5000;

export function GuestBannerCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isScreenFocused = useRef(true);
  const t = useT();
  const tg = t.guestDashboard;

  const CAPTIONS = [
    { title: tg.banner0Title, sub: tg.banner0Sub },
    { title: tg.banner1Title, sub: tg.banner1Sub },
    { title: tg.banner2Title, sub: tg.banner2Sub },
  ];

  const goTo = useCallback((idx: number) => {
    const clampedIdx = Math.max(0, Math.min(idx, GUEST_BANNERS.length - 1));
    scrollRef.current?.scrollTo({ x: clampedIdx * CARD_W, animated: true });
    setActiveIndex(clampedIdx);
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isScreenFocused.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % GUEST_BANNERS.length;
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
    }, [startTimer, stopTimer])
  );

  const handleScroll = useCallback(
    (e: any) => {
      const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
      const clamped = Math.max(0, Math.min(idx, GUEST_BANNERS.length - 1));
      setActiveIndex(clamped);
      startTimer();
    },
    [startTimer]
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_W}
      >
        {GUEST_BANNERS.map((src, i) => (
          <View key={i} style={styles.slide}>
            <Image source={src} style={styles.image} resizeMode="cover" />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.65)"]}
              style={styles.overlay}
            />
            <View style={styles.caption}>
              <Text style={styles.captionTitle}>{CAPTIONS[i]?.title ?? ""}</Text>
              <Text style={styles.captionSub} numberOfLines={1}>
                {CAPTIONS[i]?.sub ?? ""}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {GUEST_BANNERS.map((_, i) => (
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
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.5,
  },
  caption: {
    position: "absolute",
    bottom: 40,
    left: T.sp20,
    right: T.sp20,
  },
  captionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#fff",
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  captionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
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
  },
  dotActive: {
    width: 20,
    backgroundColor: "#fff",
  },
  dotInactive: {
    width: 5,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});
