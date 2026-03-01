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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INTRO_KEY = "ht_has_seen_intro";
const DURATION = 4500;
const { width, height } = Dimensions.get("window");

export async function markIntroSeen() {
  await AsyncStorage.setItem(INTRO_KEY, "true");
}

export async function hasSeenIntro(): Promise<boolean> {
  const val = await AsyncStorage.getItem(INTRO_KEY);
  return val === "true";
}

function navigateToLogin() {
  router.replace("/(auth)/login");
}

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const captionFade = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(captionFade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]).start();
    });

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: DURATION - 200,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(async () => {
      await markIntroSeen();
      navigateToLogin();
    }, DURATION);

    return () => clearTimeout(timer);
  }, []);

  async function handleSkip() {
    await markIntroSeen();
    navigateToLogin();
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0A3D62", "#0369A1", "#0E5D8A"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={[styles.pattern, StyleSheet.absoluteFillObject]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.circle,
              {
                width: 180 + i * 80,
                height: 180 + i * 80,
                borderRadius: (180 + i * 80) / 2,
                top: -60 + i * 20,
                right: -60 + i * 10,
                opacity: 0.04 + i * 0.015,
              },
            ]}
          />
        ))}
      </View>

      <Pressable
        onPress={handleSkip}
        style={[styles.skipBtn, { top: topPad + 12 }]}
        hitSlop={12}
      >
        <Text style={styles.skipText}>Skip</Text>
        <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.8)" />
      </Pressable>

      <Animated.View
        style={[
          styles.center,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: iconScale }] }]}>
          <Ionicons name="airplane" size={42} color="#fff" />
        </Animated.View>

        <Text style={styles.brand}>HealthTour</Text>
        <Text style={styles.tagline}>Operations Platform</Text>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people-outline" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.statLabel}>Patient Care</Text>
          </View>
          <View style={styles.statDot} />
          <View style={styles.stat}>
            <Ionicons name="business-outline" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.statLabel}>Multi-Clinic</Text>
          </View>
          <View style={styles.statDot} />
          <View style={styles.stat}>
            <Ionicons name="shield-checkmark-outline" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.statLabel}>Secure</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.captionWrap,
          {
            opacity: captionFade,
            paddingBottom: bottomPad + 48,
          },
        ]}
      >
        <Text style={styles.caption}>
          Your journey, beautifully organised.
        </Text>
        <Text style={styles.captionSub}>
          Premium health tourism management for modern clinics.
        </Text>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressBar, { width: progressWidth }]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pattern: {
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "#fff",
  },
  skipBtn: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 10,
  },
  skipText: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  center: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    marginBottom: 8,
  },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#fff",
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  divider: {
    width: 48,
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 1,
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  stat: {
    alignItems: "center",
    gap: 5,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.3,
  },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  captionWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 6,
  },
  caption: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    lineHeight: 26,
  },
  captionSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  progressTrack: {
    width: "60%",
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 2,
  },
});
