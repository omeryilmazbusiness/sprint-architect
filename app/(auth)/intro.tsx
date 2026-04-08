import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INTRO_KEY = "ht_has_seen_intro";
const DURATION  = 3800;
const { width }  = Dimensions.get("window");

export async function markIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(INTRO_KEY, "true");
}

export async function hasSeenIntro(): Promise<boolean> {
  const val = await AsyncStorage.getItem(INTRO_KEY);
  return val === "true";
}

function navigateToLogin(): void {
  router.replace("/(auth)/login");
}

export default function IntroScreen() {
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── Animation refs ────────────────────────────────────────────────────────
  const glowScale   = useRef(new Animated.Value(0.7)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentY    = useRef(new Animated.Value(24)).current;
  const contentOp   = useRef(new Animated.Value(0)).current;
  const captionOp   = useRef(new Animated.Value(0)).current;
  const skipOp      = useRef(new Animated.Value(0)).current;
  const progressAn  = useRef(new Animated.Value(0)).current;

  // ── Pulse refs (for the continuous glow pulse) ────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Step 1 — glow blooms in
    Animated.parallel([
      Animated.timing(glowOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(glowScale,   { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }),
    ]).start(() => {
      // Step 2 — logo springs in
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        // Step 3 — content slides up
        Animated.parallel([
          Animated.timing(contentOp, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(contentY,  { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start(() => {
          // Step 4 — caption + skip fade in
          Animated.parallel([
            Animated.timing(captionOp, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(skipOp,    { toValue: 1, duration: 500, useNativeDriver: true }),
          ]).start();
        });
      });
    });

    // Continuous glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.00, duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    // Progress bar runs over full duration
    Animated.timing(progressAn, {
      toValue: 1,
      duration: DURATION - 300,
      useNativeDriver: false,
    }).start();

    // Auto-navigate after DURATION
    const timer = setTimeout(async () => {
      await markIntroSeen();
      navigateToLogin();
    }, DURATION);

    return () => clearTimeout(timer);
  }, []);

  async function handleSkip(): Promise<void> {
    await markIntroSeen();
    navigateToLogin();
  }

  const progressWidth = progressAn.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.root}>

      {/* ── Ambient glow layers (radial effect via stacked circles) ── */}
      <Animated.View
        style={[
          styles.glowOuter,
          {
            opacity: glowOpacity,
            transform: [{ scale: Animated.multiply(glowScale, pulseAnim) }],
          },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.glowMid,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
        pointerEvents="none"
      />
      <Animated.View
        style={[
          styles.glowInner,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
        pointerEvents="none"
      />

      {/* ── Skip button ── */}
      <Animated.View style={[styles.skipWrap, { top: topPad + 16, opacity: skipOp }]}>
        <Pressable onPress={handleSkip} style={styles.skipBtn} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="arrow-forward" size={13} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </Animated.View>

      {/* ── Logo ── */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={styles.logoRing}>
          <View style={styles.logoInner}>
            <Ionicons name="airplane" size={36} color="#ffffff" />
          </View>
        </View>
      </Animated.View>

      {/* ── Brand name + tagline ── */}
      <Animated.View
        style={[
          styles.brandBlock,
          { opacity: contentOp, transform: [{ translateY: contentY }] },
        ]}
      >
        <Text style={styles.brandName}>Healory</Text>
        <View style={styles.rulerRow}>
          <View style={styles.ruler} />
          <Text style={styles.tagline}>OPERATIONS PLATFORM</Text>
          <View style={styles.ruler} />
        </View>
      </Animated.View>

      {/* ── Feature pillars ── */}
      <Animated.View
        style={[
          styles.pillarsRow,
          { opacity: contentOp, transform: [{ translateY: contentY }] },
        ]}
      >
        <Pillar icon="people-outline"          label="Patient Care" />
        <View style={styles.pillarDivider} />
        <Pillar icon="business-outline"        label="Multi-Clinic" />
        <View style={styles.pillarDivider} />
        <Pillar icon="shield-checkmark-outline" label="Secure" />
      </Animated.View>

      {/* ── Caption + progress ── */}
      <Animated.View
        style={[
          styles.captionBlock,
          { opacity: captionOp, paddingBottom: bottomPad + 40 },
        ]}
      >
        <Text style={styles.captionLine1}>Your journey,</Text>
        <Text style={styles.captionLine2}>beautifully organised.</Text>
        <Text style={styles.captionSub}>
          Premium health tourism management for modern clinics.
        </Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </Animated.View>

    </View>
  );
}

// ─── Pillar item ───────────────────────────────────────────────────────────────

function Pillar({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  return (
    <View style={styles.pillar}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.4)" />
      <Text style={styles.pillarLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const GLOW_COLOR_OUTER = "rgba(3,105,161,0.07)";
const GLOW_COLOR_MID   = "rgba(3,105,161,0.12)";
const GLOW_COLOR_INNER = "rgba(3,105,161,0.20)";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Glow layers ─────────────────────────────────────────────────────────────
  glowOuter: {
    position: "absolute",
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: GLOW_COLOR_OUTER,
  },
  glowMid: {
    position: "absolute",
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: GLOW_COLOR_MID,
  },
  glowInner: {
    position: "absolute",
    width: width * 0.42,
    height: width * 0.42,
    borderRadius: width * 0.21,
    backgroundColor: GLOW_COLOR_INNER,
  },

  // ── Skip ────────────────────────────────────────────────────────────────────
  skipWrap: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  skipText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.2,
  },

  // ── Logo ────────────────────────────────────────────────────────────────────
  logoWrap: {
    marginBottom: 36,
  },
  logoRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  logoInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  // ── Brand ────────────────────────────────────────────────────────────────────
  brandBlock: {
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 42,
    color: "#ffffff",
    letterSpacing: -1.5,
    includeFontPadding: false,
  },
  rulerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ruler: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    maxWidth: 40,
  },
  tagline: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.30)",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // ── Pillars ──────────────────────────────────────────────────────────────────
  pillarsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    gap: 0,
  },
  pillar: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
  },
  pillarLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.30)",
    letterSpacing: 0.4,
  },
  pillarDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  // ── Caption ──────────────────────────────────────────────────────────────────
  captionBlock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 4,
  },
  captionLine1: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 22,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: -0.3,
  },
  captionLine2: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: "#ffffff",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  captionSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  progressTrack: {
    width: "50%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 1,
  },
});
