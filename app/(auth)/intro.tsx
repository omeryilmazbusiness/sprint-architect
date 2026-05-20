import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Dimensions,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandLogo } from "@/components/common/BrandLogo";

const INTRO_KEY = "ht_has_seen_intro";
const DURATION = 4800;
const { width, height } = Dimensions.get("window");

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
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const screenOp = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-width)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoSc = useRef(new Animated.Value(0.72)).current;
  const ringOp = useRef(new Animated.Value(0)).current;
  const ringSc = useRef(new Animated.Value(0.6)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(18)).current;
  const tagOp = useRef(new Animated.Value(0)).current;
  const pillarsOp = useRef(new Animated.Value(0)).current;
  const pillarsY = useRef(new Animated.Value(16)).current;
  const captionOp = useRef(new Animated.Value(0)).current;
  const skipOp = useRef(new Animated.Value(0)).current;
  const progressAn = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const lineW = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(screenOp, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2800, useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: width * 1.4,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, { toValue: -width, duration: 0, useNativeDriver: true }),
      ]),
    ).start();

    const seq = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoSc, { toValue: 1, tension: 48, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(ringOp, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.spring(ringSc, { toValue: 1, tension: 36, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.timing(lineW, { toValue: 1, duration: 800, useNativeDriver: false }),
      ]),
      Animated.timing(tagOp, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(pillarsOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(pillarsY, { toValue: 0, tension: 44, friction: 9, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(captionOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(skipOp, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
    ]);
    seq.start();

    Animated.timing(progressAn, {
      toValue: 1,
      duration: DURATION - 400,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(async () => {
      await markIntroSeen();
      Animated.timing(screenOp, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(() => navigateToLogin());
    }, DURATION);

    return () => clearTimeout(timer);
  }, []);

  async function handleSkip(): Promise<void> {
    await markIntroSeen();
    Animated.timing(screenOp, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => navigateToLogin());
  }

  const progressWidth = progressAn.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const accentLineWidth = lineW.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <Animated.View style={[styles.root, { opacity: screenOp }]}>
      <View style={StyleSheet.absoluteFill} />

      {/* Cinematic vignette */}
      <LinearGradient
        colors={["#000000", "#030508", "#000000"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      {/* Teal luxury bloom */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bloomOuter,
          { opacity: logoOp, transform: [{ scale: Animated.multiply(ringSc, pulse) }] },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.bloomMid, { opacity: ringOp, transform: [{ scale: ringSc }] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.bloomInner, { opacity: ringOp }]}
      />

      {/* Light sweep */}
      <Animated.View
        pointerEvents="none"
        style={[styles.shimmerBand, { transform: [{ translateX: shimmerX }, { rotate: "-18deg" }] }]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.06)", "rgba(14,165,164,0.14)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmerGrad}
        />
      </Animated.View>

      {/* Top fade */}
      <LinearGradient
        colors={["rgba(0,0,0,0.85)", "transparent"]}
        style={styles.topFade}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.92)"]}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      <Animated.View style={[styles.skipWrap, { top: topPad + 14, opacity: skipOp }]}>
        <Pressable onPress={handleSkip} style={styles.skipBtn} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
        </Pressable>
      </Animated.View>

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoStage,
            { opacity: logoOp, transform: [{ scale: logoSc }] },
          ]}
        >
          <Animated.View
            style={[
              styles.logoRing,
              { opacity: ringOp, transform: [{ scale: ringSc }] },
            ]}
          />
          <BrandLogo variant="intro" animated glow />
        </Animated.View>

        <Animated.View
          style={[
            styles.brandBlock,
            { opacity: titleOp, transform: [{ translateY: titleY }] },
          ]}
        >
          <Text style={styles.brandName}>Healory</Text>
          <View style={styles.rulerRow}>
            <Animated.View style={[styles.ruler, { width: accentLineWidth }]} />
            <Animated.Text style={[styles.tagline, { opacity: tagOp }]}>
              OPERATIONS PLATFORM
            </Animated.Text>
            <Animated.View style={[styles.ruler, { width: accentLineWidth }]} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.pillarsRow,
            { opacity: pillarsOp, transform: [{ translateY: pillarsY }] },
          ]}
        >
          <Pillar icon="heart-outline" label="Patient Care" delay={0} />
          <View style={styles.pillarDivider} />
          <Pillar icon="business-outline" label="Multi-Clinic" delay={80} />
          <View style={styles.pillarDivider} />
          <Pillar icon="shield-checkmark-outline" label="Secure" delay={160} />
        </Animated.View>
      </View>

      <Animated.View
        style={[styles.captionBlock, { opacity: captionOp, paddingBottom: bottomPad + 36 }]}
      >
        <Text style={styles.captionLine1}>Your journey,</Text>
        <Text style={styles.captionLine2}>beautifully organised.</Text>
        <Text style={styles.captionSub}>
          Premium health tourism management for modern clinics.
        </Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]}>
            <LinearGradient
              colors={["rgba(14,165,164,0.5)", "rgba(255,255,255,0.85)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Pillar({
  icon,
  label,
  delay,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  delay: number;
}) {
  const op = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(y, { toValue: 0, tension: 52, friction: 9, useNativeDriver: true }),
      ]).start();
    }, 900 + delay);
    return () => clearTimeout(t);
  }, [delay, op, y]);

  return (
    <Animated.View style={[styles.pillar, { opacity: op, transform: [{ translateY: y }] }]}>
      <View style={styles.pillarIconWrap}>
        <Ionicons name={icon} size={15} color="rgba(14,165,164,0.85)" />
      </View>
      <Text style={styles.pillarLabel}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  bloomOuter: {
    position: "absolute",
    top: height * 0.22,
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: "rgba(14,165,164,0.06)",
    alignSelf: "center",
  },
  bloomMid: {
    position: "absolute",
    top: height * 0.3,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: "rgba(3,105,161,0.10)",
    alignSelf: "center",
  },
  bloomInner: {
    position: "absolute",
    top: height * 0.36,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: "rgba(14,165,164,0.14)",
    alignSelf: "center",
  },
  shimmerBand: {
    position: "absolute",
    top: height * 0.18,
    left: -width * 0.3,
    width: width * 0.35,
    height: height * 0.7,
  },
  shimmerGrad: {
    flex: 1,
    width: "100%",
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.22,
  },
  bottomFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.45,
  },
  skipWrap: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  skipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logoStage: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  logoRing: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  brandBlock: {
    alignItems: "center",
    gap: 12,
  },
  brandName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 44,
    color: "#FFFFFF",
    letterSpacing: -1.8,
  },
  rulerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ruler: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(14,165,164,0.55)",
    maxWidth: 120,
  },
  tagline: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 10,
    color: "rgba(255,255,255,0.38)",
    letterSpacing: 3.2,
  },
  pillarsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 36,
  },
  pillar: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  pillarIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(14,165,164,0.35)",
    backgroundColor: "rgba(14,165,164,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillarLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.5,
  },
  pillarDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
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
    color: "rgba(255,255,255,0.42)",
    letterSpacing: -0.3,
  },
  captionLine2: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  captionSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.28)",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 22,
  },
  progressTrack: {
    width: "56%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 1,
    overflow: "hidden",
  },
});
