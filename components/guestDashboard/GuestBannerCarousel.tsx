import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  Platform,
} from "react-native";
import { GUEST_BANNERS } from "@/constants/guestBanners";
import { T } from "@/constants/adminTheme";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_H = 200;
const CARD_MARGIN = T.sp16;
const CARD_W = SCREEN_W - CARD_MARGIN * 2;

export function GuestBannerCarousel() {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
    setActiveIndex(Math.max(0, Math.min(idx, GUEST_BANNERS.length - 1)));
  }, []);

  const goTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * CARD_W, animated: true });
    setActiveIndex(idx);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={CARD_W}
        contentContainerStyle={{ paddingHorizontal: 0 }}
      >
        {GUEST_BANNERS.map((src, i) => (
          <View key={i} style={styles.slide}>
            <Image source={src} style={styles.image} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {GUEST_BANNERS.map((_, i) => (
          <Pressable key={i} onPress={() => goTo(i)} hitSlop={8}>
            <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: CARD_MARGIN,
    marginBottom: T.sp16,
  },
  slide: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: T.r16,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: T.sp8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.border,
  },
  dotActive: {
    width: 18,
    borderRadius: 3,
    backgroundColor: T.accent,
  },
});
