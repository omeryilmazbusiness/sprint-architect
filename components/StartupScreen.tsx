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

const { width } = Dimensions.get("window");

// ── Timing ─────────────────────────────────────────────────────────────────────
const HOLD_MS = 4600; // hold before fade begins — intentionally deliberate
const FADE_MS = 750;  // fade-out duration

// ── Gold palette constants ──────────────────────────────────────────────────────
// Base:  #02030F  (deep absolute black)
// Gold:  rgba(212,175,55,...)   — classic soft gold
// Cream: rgba(225,205,155,...)  — champagne / warm cream
// Dark gold layer: rgba(32,24,4,...) — near-black with gold warmth

// ─── Premium background ────────────────────────────────────────────────────────
// Five layers stacked on a deep black base:
//   1. Static diagonal warm-black sweep — bottom-left to top-right
//   2. Static inverted gold bloom — top-right corner
//   3. Animated soft gold radial glow (breathes)
//   4. Top/bottom edge vignette
//   5. Horizontal side vignette

function PremiumBackground({ glowOp, glowSc, pulseSc }: {
  glowOp:  Animated.Value;
  glowSc:  Animated.Value;
  pulseSc: Animated.Value;
}) {
  return (
    <>
      {/* Layer 1 — warm-black sweep from bottom-left */}
      <LinearGradient
        colors={["rgba(32,24,4,0.85)", "rgba(10,7,1,0.30)", "transparent"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 2 — soft gold bloom from top-right corner */}
      <LinearGradient
        colors={["rgba(44,32,6,0.48)", "rgba(18,13,2,0.18)", "transparent"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.8 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 3 — animated soft gold radial glow behind brand area */}
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

      {/* Layer 4 — top/bottom edge vignette */}
      <LinearGradient
        colors={["rgba(0,0,4,0.88)", "transparent", "transparent", "rgba(0,0,4,0.82)"]}
        locations={[0, 0.28, 0.72, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Layer 5 — horizontal side vignette */}
      <LinearGradient
        colors={["rgba(0,0,4,0.62)", "transparent", "rgba(0,0,4,0.62)"]}
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
    backgroundColor: "rgba(52,38,5,0.22)",
  },
  radialMid: {
    position: "absolute",
    width: width * 0.88,
    height: width * 0.88,
    borderRadius: width * 0.44,
    backgroundColor: "rgba(72,55,8,0.30)",
  },
  radialCore: {
    position: "absolute",
    width: width * 0.42,
    height: width * 0.42,
    borderRadius: width * 0.21,
    backgroundColor: "rgba(92,70,10,0.38)",
  },
});

// ─── Progress line ──────────────────────────────────────────────────────────────

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
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 1,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: "rgba(212,175,55,0.65)",
    borderRadius: 1,
  },
});

// ─── Feature row ───────────────────────────────────────────────────────────────

type FeatureProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  desc: string;
};

function Feature({ icon, title, desc }: FeatureProps) {
  return (
    <View style={featureStyles.row}>
      <View style={featureStyles.iconBox}>
        <Ionicons name={icon} size={14} color="rgba(212,175,55,0.60)" />
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
    borderColor: "rgba(212,175,55,0.14)",
    backgroundColor: "rgba(45,34,5,0.14)",
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
    color: "rgba(230,215,165,0.82)",
    letterSpacing: 0.1,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(185,165,115,0.35)",
    lineHeight: 15,
  },
});

// ─── Main overlay ──────────────────────────────────────────────────────────────

export default function StartupScreen() {
  const [visible, setVisible] = useState(true);
  const insets    = useSafeAreaInsets();
  const screenOp  = useRef(new Animated.Value(1)).current;
  const pulseSc   = useRef(new Animated.Value(1)).current;

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
      // Stage 1 — gold glow blooms (750ms)
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

    // Slow ambient gold breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseSc, { toValue: 1.08, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulseSc, { toValue: 1.00, duration: 2800, useNativeDriver: true }),
      ])
    ).start();

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

      {/* ── Premium gold background layers ── */}
      <PremiumBackground glowOp={glowOp} glowSc={glowSc} pulseSc={pulseSc} />

      {/* ── Center content column ── */}
      <View style={styles.content}>

        {/* Logo — double gold ring */}
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

      {/* ── Bottom: gold progress line + label ── */}
      <Animated.View
        style={[styles.bottomBlock, { opacity: bottomOp, paddingBottom: bottomPad + 22 }]}
      >
        <ProgressLine duration={HOLD_MS - 200} />
        <Text style={styles.bottomLabel}>Healory · Secure Health Tourism Platform</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#02030F",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    alignItems: "center",
    paddingHorizontal: 36,
    gap: 0,
    width: "100%",
  },

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
    borderColor: "rgba(212,175,55,0.22)",
    backgroundColor: "rgba(35,26,4,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.16)",
    backgroundColor: "rgba(50,38,6,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },

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
    backgroundColor: "rgba(180,145,40,0.22)",
    maxWidth: 32,
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 8.5,
    color: "rgba(212,175,55,0.45)",
    letterSpacing: 3,
    textTransform: "uppercase",
  },

  sectionSep: {
    width: "72%",
    height: 1,
    backgroundColor: "rgba(180,145,40,0.15)",
    borderRadius: 1,
    marginBottom: 22,
  },

  featuresBlock: {
    width: "100%",
    maxWidth: 280,
    gap: 0,
    marginBottom: 28,
  },
  featureGap: {
    height: 14,
  },

  copyBlock: {
    alignItems: "center",
    gap: 2,
  },
  copyLine1: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(198,178,130,0.42)",
    letterSpacing: 0.1,
    textAlign: "center",
  },
  copyLine2: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "rgba(220,200,155,0.78)",
    letterSpacing: 0.1,
    textAlign: "center",
  },

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
    color: "rgba(180,150,55,0.30)",
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
