import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  StatusBar,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Timing ────────────────────────────────────────────────────────────────────
const TOTAL_MS   = 3600; // total hold before fade
const FADE_MS    = 800;  // fade-out
const SWEEP_MS   = 3200; // light sweep travel time

// ── Loading line ──────────────────────────────────────────────────────────────
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
    <View style={lineStyles.track}>
      <Animated.View style={[lineStyles.barWrap, { width: barWidth }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.60)", "rgba(212,175,55,0.95)", "rgba(255,255,255,0.50)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Soft glow under bar */}
        <View style={lineStyles.glow} />
      </Animated.View>
    </View>
  );
}

const lineStyles = StyleSheet.create({
  track: {
    width: "72%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    overflow: "hidden",
  },
  barWrap: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    bottom: -3,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: "rgba(212,175,55,0.18)",
    borderRadius: 3,
  },
});

// ── Main component ────────────────────────────────────────────────────────────
export default function StartupScreen() {
  const [visible, setVisible] = useState(true);
  const insets   = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Screen fade-out
  const screenOp = useRef(new Animated.Value(1)).current;

  // Background breathing
  const breatheSc = useRef(new Animated.Value(1)).current;

  // Light sweep translateX (starts fully left, travels to fully right)
  const sweepX = useRef(new Animated.Value(-SW * 0.5)).current;
  const sweepOp = useRef(new Animated.Value(0)).current;

  // Title animations
  const titleOp = useRef(new Animated.Value(0)).current;
  const titleY  = useRef(new Animated.Value(10)).current;

  // Tagline animations
  const tagOp = useRef(new Animated.Value(0)).current;
  const tagY  = useRef(new Animated.Value(6)).current;

  // Bottom bar
  const bottomOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── Breathing loop (subtle, 5s cycle)
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheSc, {
          toValue: 1.05,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(breatheSc, {
          toValue: 1.00,
          duration: 2600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // ── Light sweep (starts after 300ms, very soft)
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(sweepOp, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sweepX, {
          toValue: SW * 1.2,
          duration: SWEEP_MS,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // ── Staggered UI reveal
    Animated.sequence([
      // Title fades in + rises (delay 300ms)
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(titleY,  { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      // Tagline follows (delay 100ms after title)
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(tagOp, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(tagY,  { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      // Bottom bar appears
      Animated.delay(100),
      Animated.timing(bottomOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    // ── Fade out entire screen after TOTAL_MS
    const timer = setTimeout(() => {
      Animated.timing(screenOp, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, TOTAL_MS);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.root, { opacity: screenOp, pointerEvents: "none" }]}
    >
      {Platform.OS === "ios" && <StatusBar barStyle="light-content" />}

      {/* ── Layer 1: Black base ── */}
      <View style={StyleSheet.absoluteFillObject} />

      {/* ── Layer 2: Circle image (breathing scale) ── */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          { transform: [{ scale: breatheSc }] },
        ]}
      >
        <Image
          source={require("../assets/images/healory-circle.png")}
          style={styles.bgImage}
          resizeMode="cover"
        />
      </Animated.View>

      {/* ── Layer 3: Depth gradient (top dark, center transparent, bottom dark) ── */}
      <LinearGradient
        colors={[
          "rgba(0,0,0,0.72)",
          "rgba(0,0,0,0.10)",
          "rgba(0,0,0,0.10)",
          "rgba(0,0,0,0.78)",
        ]}
        locations={[0, 0.32, 0.60, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Layer 4: Side vignette ── */}
      <LinearGradient
        colors={["rgba(0,0,0,0.55)", "transparent", "rgba(0,0,0,0.55)"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Layer 5: Light sweep ── */}
      <Animated.View
        style={[
          styles.sweepWrap,
          {
            opacity: sweepOp,
            transform: [{ translateX: sweepX }],
            pointerEvents: "none",
          },
        ]}
      >
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255,255,255,0.025)",
            "rgba(255,255,255,0.055)",
            "rgba(255,255,255,0.025)",
            "transparent",
          ]}
          locations={[0, 0.3, 0.5, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sweepGradient}
        />
      </Animated.View>

      {/* ── Content ── */}
      <View style={styles.content}>

        {/* HEALORY title */}
        <Animated.View
          style={[
            styles.titleWrap,
            {
              opacity: titleOp,
              transform: [{ translateY: titleY }],
            },
          ]}
        >
          <Text style={styles.titleText}>HEALORY</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View
          style={[
            styles.taglineWrap,
            {
              opacity: tagOp,
              transform: [{ translateY: tagY }],
            },
          ]}
        >
          <Text style={styles.taglineText}>Precision Healthcare Experience</Text>
        </Animated.View>

      </View>

      {/* ── Bottom: loading line + label ── */}
      <Animated.View
        style={[
          styles.bottomBlock,
          { opacity: bottomOp, paddingBottom: bottomPad + 28 },
        ]}
      >
        <ProgressLine duration={TOTAL_MS - 400} />
        <Text style={styles.bottomLabel}>HEALORY · HEALTH TOURISM PLATFORM</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  bgImage: {
    width: "100%",
    height: "100%",
  },

  // Light sweep band (wide, very translucent)
  sweepWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: -(SW * 0.4),
    width: SW * 0.8,
  },
  sweepGradient: {
    flex: 1,
  },

  // Main content positioned slightly above center
  content: {
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: -SH * 0.04, // nudge above center toward circle top
    gap: 16,
  },

  titleWrap: {
    alignItems: "center",
    gap: 10,
  },
  titleText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 46,
    color: "#FFFFFF",
    letterSpacing: 12,
    textAlign: "center",
    // Subtle gold text shadow for glow
    ...Platform.select({
      ios: {
        shadowColor: "rgba(212,175,55,0.9)",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
      },
      default: {},
    }),
  },
  titleUnderline: {
    width: 42,
    height: 1.5,
    backgroundColor: "rgba(212,175,55,0.50)",
    borderRadius: 1,
  },

  taglineWrap: {
    alignItems: "center",
  },
  taglineText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "rgba(210,200,180,0.68)",
    letterSpacing: 2.5,
    textAlign: "center",
    textTransform: "uppercase",
  },

  // Bottom bar
  bottomBlock: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  bottomLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 9.5,
    color: "rgba(180,160,100,0.32)",
    letterSpacing: 2,
    textAlign: "center",
  },
});
