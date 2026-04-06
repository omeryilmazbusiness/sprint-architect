import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const HOLD_MS  = 1700;
const FADE_MS  = 550;

// ─── Dot loader ───────────────────────────────────────────────────────────────

function LoadingDots() {
  const dot0 = useRef(new Animated.Value(0.25)).current;
  const dot1 = useRef(new Animated.Value(0.25)).current;
  const dot2 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    function pulse(val: Animated.Value, delay: number) {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, { toValue: 1,    duration: 360, useNativeDriver: true }),
            Animated.timing(val, { toValue: 0.25, duration: 360, useNativeDriver: true }),
            Animated.delay(360),
          ])
        ),
      ]);
    }

    Animated.parallel([
      pulse(dot0, 0),
      pulse(dot1, 240),
      pulse(dot2, 480),
    ]).start();
  }, []);

  return (
    <View style={dotStyles.row}>
      {[dot0, dot1, dot2].map((anim, i) => (
        <Animated.View key={i} style={[dotStyles.dot, { opacity: anim }]} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
});

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function StartupScreen() {
  const [visible, setVisible] = useState(true);
  const insets   = useSafeAreaInsets();
  const screenOp = useRef(new Animated.Value(1)).current;

  // Content entrance animations
  const glowOp  = useRef(new Animated.Value(0)).current;
  const glowSc  = useRef(new Animated.Value(0.6)).current;
  const logoOp  = useRef(new Animated.Value(0)).current;
  const logoSc  = useRef(new Animated.Value(0.55)).current;
  const textY   = useRef(new Animated.Value(18)).current;
  const textOp  = useRef(new Animated.Value(0)).current;
  const dotsOp  = useRef(new Animated.Value(0)).current;
  const pulseSc = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      // 1. Glow blooms in
      Animated.parallel([
        Animated.timing(glowOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(glowSc, { toValue: 1, tension: 35, friction: 8, useNativeDriver: true }),
      ]),
      // 2. Logo springs in
      Animated.parallel([
        Animated.spring(logoSc, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      // 3. Brand text slides up
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textY,  { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
      // 4. Dots appear
      Animated.timing(dotsOp, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Subtle continuous pulse on the outer glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseSc, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseSc, { toValue: 1.00, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Fade-out after hold period
    const timer = setTimeout(() => {
      Animated.timing(screenOp, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, HOLD_MS);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const topPad    = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOp, pointerEvents: "none" }]}>
      {Platform.OS === "ios" && <StatusBar barStyle="light-content" />}

      {/* ── Ambient glow layers ── */}
      <Animated.View
        style={[
          styles.glowOuter,
          { opacity: glowOp, transform: [{ scale: Animated.multiply(glowSc, pulseSc) }] },
        ]}
      />
      <Animated.View
        style={[styles.glowMid, { opacity: glowOp, transform: [{ scale: glowSc }] }]}
      />
      <Animated.View
        style={[styles.glowCore, { opacity: glowOp, transform: [{ scale: glowSc }] }]}
      />

      {/* ── Logo ring ── */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: logoOp, transform: [{ scale: logoSc }], marginBottom: 28 },
        ]}
      >
        <View style={styles.logoRingOuter}>
          <View style={styles.logoRingInner}>
            <Ionicons name="airplane" size={34} color="#ffffff" />
          </View>
        </View>
      </Animated.View>

      {/* ── Brand name + tagline ── */}
      <Animated.View
        style={[
          styles.brandBlock,
          { opacity: textOp, transform: [{ translateY: textY }] },
        ]}
      >
        <Text style={styles.brandName}>HealthTour</Text>
        <View style={styles.rulerRow}>
          <View style={styles.ruler} />
          <Text style={styles.tagline}>OPERATIONS PLATFORM</Text>
          <View style={styles.ruler} />
        </View>
      </Animated.View>

      {/* ── Loading dots ── */}
      <Animated.View style={[styles.dotsWrap, { opacity: dotsOp }]}>
        <LoadingDots />
      </Animated.View>

      {/* ── Bottom label ── */}
      <Animated.View
        style={[
          styles.bottomLabel,
          { opacity: textOp, paddingBottom: bottomPad + 20 },
        ]}
      >
        <Text style={styles.bottomText}>Premium Health Tourism Management</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GLOW_OUTER = "rgba(3,105,161,0.08)";
const GLOW_MID   = "rgba(3,105,161,0.14)";
const GLOW_CORE  = "rgba(3,105,161,0.22)";

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Glow ────────────────────────────────────────────────────────────────────
  glowOuter: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: GLOW_OUTER,
  },
  glowMid: {
    position: "absolute",
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: GLOW_MID,
  },
  glowCore: {
    position: "absolute",
    width: width * 0.44,
    height: width * 0.44,
    borderRadius: width * 0.22,
    backgroundColor: GLOW_CORE,
  },

  // ── Logo ────────────────────────────────────────────────────────────────────
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoRingOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoRingInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Brand ────────────────────────────────────────────────────────────────────
  brandBlock: {
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
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
    maxWidth: 36,
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: 3.2,
    textTransform: "uppercase",
  },

  // ── Dots ────────────────────────────────────────────────────────────────────
  dotsWrap: {
    marginTop: 40,
  },

  // ── Bottom ──────────────────────────────────────────────────────────────────
  bottomLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  bottomText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.18)",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
