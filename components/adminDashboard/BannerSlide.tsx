import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BannerBackground3D } from "./BannerBackground3D";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BannerChip {
  label: string;
  value: string | number;
}

export interface BannerSlideData {
  id: string;
  gradientColors: readonly [string, string, ...string[]];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  chips: BannerChip[];
  ctaText: string;
  onCta: () => void;
}

interface Props {
  slide: BannerSlideData;
  height: number;
  width: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BannerSlide({ slide, height, width }: Props) {
  const isNarrow = width < 360;

  return (
    <BannerBackground3D colors={slide.gradientColors} height={height} width={width}>
      {/* ── Content grid ──────────────────────────────────────────────────── */}
      <View style={[styles.content, { width, height }]}>
        {/* ── Headline row ──────────────────────────────────────────────── */}
        <View style={styles.headRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={slide.icon} size={17} color="rgba(255,255,255,0.95)" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {slide.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {slide.subtitle}
            </Text>
          </View>
        </View>

        {/* ── KPI chips ─────────────────────────────────────────────────── */}
        <View style={styles.chipsRow}>
          {slide.chips.map((chip) => (
            <View key={chip.label} style={styles.chip}>
              <Text style={styles.chipValue}>{chip.value}</Text>
              <Text style={styles.chipLabel}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* ── CTA button ────────────────────────────────────────────────── */}
        <View style={isNarrow ? styles.ctaRowFull : styles.ctaRowEnd}>
          <Pressable
            style={({ pressed }) => [
              styles.cta,
              isNarrow && styles.ctaFull,
              { opacity: pressed ? 0.82 : 1 },
            ]}
            onPress={slide.onCta}
            hitSlop={8}
          >
            <Text style={styles.ctaText}>{slide.ctaText}</Text>
            <Ionicons name="arrow-forward" size={13} color="#1a1a1a" />
          </Pressable>
        </View>
      </View>
    </BannerBackground3D>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === "web" ? 20 : 18,
    paddingTop: 0,
    justifyContent: "flex-end",
    gap: 11,
  },

  headRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
  },

  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#ffffff",
    lineHeight: 25,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    color: "rgba(255,255,255,0.80)",
    marginTop: 2,
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  chipsRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    minHeight: 44,
    alignSelf: "flex-start",
  },
  chipValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.30)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chipLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    color: "rgba(255,255,255,0.80)",
    textShadowColor: "rgba(0,0,0,0.20)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  ctaRowEnd: {
    alignItems: "flex-end",
  },
  ctaRowFull: {
    alignItems: "stretch",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 22,
    minHeight: 44,
    alignSelf: "flex-end",
  },
  ctaFull: {
    alignSelf: "stretch",
    justifyContent: "center",
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
    color: "#1a1a1a",
  },
});
