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

// ── Timing ────────────────────────────────────────────────────────────────────
const HOLD_MS = 3200; // visible hold before fade begins
const FADE_MS = 700;  // fade-out duration

// ─── Progress line ─────────────────────────────────────────────────────────────

function ProgressLine({ duration }: { duration: number }) {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
  }, []);

  const barWidth = fill.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={progressStyles.track}>
      <Animated.View style={[progressStyles.bar, { width: barWidth }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    width: "52%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 1,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.48)",
    borderRadius: 1,
  },
});

// ─── Feature row ──────────────────────────────────────────────────────────────

type FeatureProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  desc: string;
};

function Feature({ icon, title, desc }: FeatureProps) {
  return (
    <View style={featureStyles.row}>
      <View style={featureStyles.iconBox}>
        <Ionicons name={icon} size={14} color="rgba(255,255,255,0.40)" />
      </View>
      <View style={featureStyles.textCol}>
        <Text style={featureStyles.title}>{title}</Text>
        <Text style={featureStyles.desc}>{desc}</Text>
      </View>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.1,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.28)",
    lineHeight: 15,
  },
});

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function StartupScreen() {
  const [visible, setVisible] = useState(true);
  const insets    = useSafeAreaInsets();
  const screenOp  = useRef(new Animated.Value(1)).current;
  const pulseSc   = useRef(new Animated.Value(1)).current;

  // Entrance animation values (useNativeDriver: true)
  const glowOp   = useRef(new Animated.Value(0)).current;
  const glowSc   = useRef(new Animated.Value(0.6)).current;
  const logoOp   = useRef(new Animated.Value(0)).current;
  const logoSc   = useRef(new Animated.Value(0.5)).current;
  const nameOp   = useRef(new Animated.Value(0)).current;
  const nameY    = useRef(new Animated.Value(22)).current;
  const featOp   = useRef(new Animated.Value(0)).current;
  const featY    = useRef(new Animated.Value(14)).current;
  const copyOp   = useRef(new Animated.Value(0)).current;
  const bottomOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequential entrance — each stage waits for the previous
    Animated.sequence([
      // Stage 1 — glow blooms (700ms)
      Animated.parallel([
        Animated.timing(glowOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(glowSc, { toValue: 1, tension: 32, friction: 8, useNativeDriver: true }),
      ]),
      // Stage 2 — logo springs in (530ms)
      Animated.parallel([
        Animated.spring(logoSc, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
      // Stage 3 — brand name slides up (480ms)
      Animated.parallel([
        Animated.timing(nameOp, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(nameY,  { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      // Stage 4 — features fade in (440ms)
      Animated.parallel([
        Animated.timing(featOp, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(featY,  { toValue: 0, duration: 460, useNativeDriver: true }),
      ]),
      // Stage 5 — welcome copy + bottom bar (380ms)
      Animated.parallel([
        Animated.timing(copyOp,   { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(bottomOp, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
    ]).start();

    // Continuous ambient glow breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseSc, { toValue: 1.07, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulseSc, { toValue: 1.00, duration: 2400, useNativeDriver: true }),
      ])
    ).start();

    // Schedule fade-out
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

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOp, pointerEvents: "none" }]}>
      {Platform.OS === "ios" && <StatusBar barStyle="light-content" />}

      {/* ── Ambient glow: three stacked radial circles ── */}
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

      {/* ── Center content column ── */}
      <View style={styles.content}>

        {/* Logo — concentric rings */}
        <Animated.View
          style={[styles.logoWrap, { opacity: logoOp, transform: [{ scale: logoSc }] }]}
        >
          <View style={styles.ringOuter}>
            <View style={styles.ringInner}>
              <Ionicons name="airplane" size={30} color="#ffffff" />
            </View>
          </View>
        </Animated.View>

        {/* Brand name */}
        <Animated.View
          style={[styles.brandBlock, { opacity: nameOp, transform: [{ translateY: nameY }] }]}
        >
          <Text style={styles.brandName}>Healory</Text>
          <View style={styles.rulerRow}>
            <View style={styles.ruler} />
            <Text style={styles.tagline}>HEALTH OPERATIONS PLATFORM</Text>
            <View style={styles.ruler} />
          </View>
        </Animated.View>

        {/* Thin section separator */}
        <Animated.View style={[styles.sectionSep, { opacity: featOp }]} />

        {/* Feature rows */}
        <Animated.View
          style={[styles.featuresBlock, { opacity: featOp, transform: [{ translateY: featY }] }]}
        >
          <Feature
            icon="calendar-outline"
            title="Appointments"
            desc="Book and track every clinic visit with ease"
          />
          <View style={styles.featureGap} />
          <Feature
            icon="heart-outline"
            title="Care Journey"
            desc="Monitor health milestones every step of the way"
          />
          <View style={styles.featureGap} />
          <Feature
            icon="car-outline"
            title="Transport & Stay"
            desc="Airport transfers and hotel arrangements, handled"
          />
        </Animated.View>

        {/* Welcome copy */}
        <Animated.View style={[styles.copyBlock, { opacity: copyOp }]}>
          <Text style={styles.copyLine1}>Your complete care journey,</Text>
          <Text style={styles.copyLine2}>seamlessly managed.</Text>
        </Animated.View>

      </View>

      {/* ── Bottom: progress line + label ── */}
      <Animated.View
        style={[styles.bottomBlock, { opacity: bottomOp, paddingBottom: bottomPad + 22 }]}
      >
        <ProgressLine duration={HOLD_MS - 180} />
        <Text style={styles.bottomLabel}>Healory · Secure Health Tourism Platform</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GLOW_OUTER = "rgba(3,105,161,0.07)";
const GLOW_MID   = "rgba(3,105,161,0.13)";
const GLOW_CORE  = "rgba(3,105,161,0.22)";

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Glow ─────────────────────────────────────────────────────────────────────
  glowOuter: {
    position: "absolute",
    width: width * 1.6,
    height: width * 1.6,
    borderRadius: width * 0.8,
    backgroundColor: GLOW_OUTER,
  },
  glowMid: {
    position: "absolute",
    width: width * 0.92,
    height: width * 0.92,
    borderRadius: width * 0.46,
    backgroundColor: GLOW_MID,
  },
  glowCore: {
    position: "absolute",
    width: width * 0.44,
    height: width * 0.44,
    borderRadius: width * 0.22,
    backgroundColor: GLOW_CORE,
  },

  // ── Content ────────────────────────────────────────────────────────────────
  content: {
    alignItems: "center",
    paddingHorizontal: 36,
    gap: 0,
    width: "100%",
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  ringOuter: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Brand ─────────────────────────────────────────────────────────────────
  brandBlock: {
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  brandName: {
    fontFamily: "Inter_700Bold",
    fontSize: 44,
    color: "#ffffff",
    letterSpacing: -2,
    includeFontPadding: false,
  },
  rulerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  ruler: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.09)",
    maxWidth: 32,
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 8.5,
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // ── Section separator ─────────────────────────────────────────────────────
  sectionSep: {
    width: "72%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 1,
    marginBottom: 22,
  },

  // ── Features ──────────────────────────────────────────────────────────────
  featuresBlock: {
    width: "100%",
    maxWidth: 280,
    gap: 0,
    marginBottom: 28,
  },
  featureGap: {
    height: 14,
  },

  // ── Copy ──────────────────────────────────────────────────────────────────
  copyBlock: {
    alignItems: "center",
    gap: 2,
  },
  copyLine1: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.40)",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  copyLine2: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(255,255,255,0.70)",
    letterSpacing: 0.1,
    textAlign: "center",
  },

  // ── Bottom ────────────────────────────────────────────────────────────────
  bottomBlock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 32,
  },
  bottomLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.16)",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
