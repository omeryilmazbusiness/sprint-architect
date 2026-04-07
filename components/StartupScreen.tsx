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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

// ── Timing ────────────────────────────────────────────────────────────────────
const HOLD_MS = 3800; // hold before fade begins
const FADE_MS = 750;  // fade-out duration

// ─── Premium background ───────────────────────────────────────────────────────
// Four layers stacked on a deep navy-black base:
//   1. Static diagonal navy gradient — bottom-left to top-right
//   2. Static inverted bloom — top-right to bottom-left
//   3. Animated radial glow (navy, breathes)
//   4. Vignette — darkens edges, keeps center legible

function PremiumBackground({ glowOp, glowSc, pulseSc }: {
  glowOp:  Animated.Value;
  glowSc:  Animated.Value;
  pulseSc: Animated.Value;
}) {
  return (
    <>
      {/* Layer 1 — diagonal navy gradient sweep from bottom-left */}
      <LinearGradient
        colors={["rgba(6,18,58,0.90)", "rgba(2,5,22,0.30)", "transparent"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 2 — soft navy bloom from top-right corner */}
      <LinearGradient
        colors={["rgba(12,28,80,0.55)", "rgba(4,10,35,0.20)", "transparent"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.8 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 3 — animated deep navy radial glow behind the brand area */}
      <Animated.View
        style={[
          bgStyles.radialOuter,
          {
            opacity: glowOp,
            transform: [{ scale: Animated.multiply(glowSc, pulseSc) }],
          },
        ]}
      />
      <Animated.View
        style={[bgStyles.radialMid, { opacity: glowOp, transform: [{ scale: glowSc }] }]}
      />
      <Animated.View
        style={[bgStyles.radialCore, { opacity: glowOp, transform: [{ scale: glowSc }] }]}
      />

      {/* Layer 4 — edge vignette: darkens corners for cinematic depth */}
      <LinearGradient
        colors={["rgba(0,0,6,0.85)", "transparent", "transparent", "rgba(0,0,6,0.80)"]}
        locations={[0, 0.28, 0.72, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 5 — horizontal side vignette */}
      <LinearGradient
        colors={["rgba(0,0,6,0.60)", "transparent", "rgba(0,0,6,0.60)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </>
  );
}

const bgStyles = StyleSheet.create({
  radialOuter: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: "rgba(8,24,80,0.22)",
  },
  radialMid: {
    position: "absolute",
    width: width * 0.88,
    height: width * 0.88,
    borderRadius: width * 0.44,
    backgroundColor: "rgba(14,38,110,0.32)",
  },
  radialCore: {
    position: "absolute",
    width: width * 0.42,
    height: width * 0.42,
    borderRadius: width * 0.21,
    backgroundColor: "rgba(20,52,140,0.40)",
  },
});

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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 1,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: "rgba(120,160,255,0.55)",
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
        <Ionicons name={icon} size={14} color="rgba(140,175,255,0.55)" />
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
    borderColor: "rgba(80,120,220,0.12)",
    backgroundColor: "rgba(30,60,140,0.12)",
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
    color: "rgba(200,215,255,0.72)",
    letterSpacing: 0.1,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(160,180,230,0.30)",
    lineHeight: 15,
  },
});

// ─── Main overlay ─────────────────────────────────────────────────────────────

export default function StartupScreen() {
  const [visible, setVisible] = useState(true);
  const insets    = useSafeAreaInsets();
  const screenOp  = useRef(new Animated.Value(1)).current;
  const pulseSc   = useRef(new Animated.Value(1)).current;

  // Entrance animation values
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
    Animated.sequence([
      // Stage 1 — background glow blooms (750ms)
      Animated.parallel([
        Animated.timing(glowOp, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.spring(glowSc, { toValue: 1, tension: 30, friction: 8, useNativeDriver: true }),
      ]),
      // Stage 2 — logo springs in (560ms)
      Animated.parallel([
        Animated.spring(logoSc, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 440, useNativeDriver: true }),
      ]),
      // Stage 3 — brand name slides up (500ms)
      Animated.parallel([
        Animated.timing(nameOp, { toValue: 1, duration: 460, useNativeDriver: true }),
        Animated.timing(nameY,  { toValue: 0, duration: 510, useNativeDriver: true }),
      ]),
      // Stage 4 — features fade in (460ms)
      Animated.parallel([
        Animated.timing(featOp, { toValue: 1, duration: 430, useNativeDriver: true }),
        Animated.timing(featY,  { toValue: 0, duration: 470, useNativeDriver: true }),
      ]),
      // Stage 5 — welcome copy + bottom bar (400ms)
      Animated.parallel([
        Animated.timing(copyOp,   { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(bottomOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // Slow ambient glow breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseSc, { toValue: 1.08, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulseSc, { toValue: 1.00, duration: 2800, useNativeDriver: true }),
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

      {/* ── Premium background layers ── */}
      <PremiumBackground glowOp={glowOp} glowSc={glowSc} pulseSc={pulseSc} />

      {/* ── Center content column ── */}
      <View style={styles.content}>

        {/* Logo — double ring */}
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

        {/* Section separator */}
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
        <ProgressLine duration={HOLD_MS - 200} />
        <Text style={styles.bottomLabel}>Healory · Secure Health Tourism Platform</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#02030F",
    alignItems: "center",
    justifyContent: "center",
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
    borderColor: "rgba(80,120,220,0.18)",
    backgroundColor: "rgba(15,35,100,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(100,140,240,0.14)",
    backgroundColor: "rgba(20,50,130,0.22)",
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
    backgroundColor: "rgba(80,120,220,0.18)",
    maxWidth: 32,
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 8.5,
    color: "rgba(140,170,240,0.35)",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  // ── Section separator ─────────────────────────────────────────────────────
  sectionSep: {
    width: "72%",
    height: 1,
    backgroundColor: "rgba(60,100,200,0.12)",
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
    color: "rgba(170,190,255,0.38)",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  copyLine2: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(200,215,255,0.72)",
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
    color: "rgba(120,150,220,0.22)",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
