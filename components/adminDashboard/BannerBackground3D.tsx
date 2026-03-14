import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  colors: readonly [string, string, ...string[]];
  height: number;
  children: React.ReactNode;
}

export function BannerBackground3D({ colors, height, children }: Props) {
  const { width } = useWindowDimensions();

  // ── Blob animation refs ────────────────────────────────────────────────────
  const blob1TranslateY = useRef(new Animated.Value(0)).current;
  const blob2TranslateY = useRef(new Animated.Value(0)).current;
  const blob1TranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function makeLoop(val: Animated.Value, duration: number, delta: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: delta,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ]),
      );
    }

    const l1 = makeLoop(blob1TranslateY, 3200, -4);
    const l2 = makeLoop(blob2TranslateY, 4400, 3);
    const l3 = makeLoop(blob1TranslateX, 3600, 3);

    l1.start();
    l2.start();
    l3.start();

    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [blob1TranslateY, blob2TranslateY, blob1TranslateX]);

  const blobSize1 = width * 0.60;
  const blobSize2 = width * 0.42;

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      {/* ── Layer 1: Main gradient ─────────────────────────────────────────── */}
      <LinearGradient
        colors={colors}
        start={{ x: 0.0, y: 0.0 }}
        end={{ x: 1.0, y: 1.0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Layer 2: Blob shapes ───────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: blobSize1,
            height: blobSize1,
            borderRadius: blobSize1 / 2,
            top: -blobSize1 * 0.45,
            right: -blobSize1 * 0.28,
            backgroundColor: "rgba(255,255,255,0.12)",
            transform: [
              { translateY: blob1TranslateY },
              { translateX: blob1TranslateX },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          {
            width: blobSize2,
            height: blobSize2,
            borderRadius: blobSize2 / 2,
            bottom: -blobSize2 * 0.45,
            left: -blobSize2 * 0.20,
            backgroundColor: "rgba(255,255,255,0.09)",
            transform: [{ translateY: blob2TranslateY }],
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            width: 72,
            height: 72,
            borderRadius: 36,
            top: "28%",
            right: "22%",
            backgroundColor: "rgba(255,255,255,0.07)",
          },
        ]}
      />

      {/* ── Layer 3: Glass / white scrim ──────────────────────────────────── */}
      <View style={styles.scrim} />

      {/* ── Layer 4: Bottom gradient fade for text contrast ───────────────── */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.30)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: "35%" }]}
        pointerEvents="none"
      />

      {/* ── Content ───────────────────────────────────────────────────────── */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
