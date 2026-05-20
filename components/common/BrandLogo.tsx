import React, { useEffect, useRef } from "react";
import { Animated, Image, Platform, StyleSheet, View } from "react-native";

const logoOpaque = require("@/assets/images/logo.png") as number;
const logoTransparent = require("@/assets/images/logo-transparent.png") as number;

export type BrandLogoVariant = "login" | "header" | "intro";

const SIZES: Record<BrandLogoVariant, { width: number; height: number }> = {
  login: { width: 96, height: 96 },
  intro: { width: 128, height: 128 },
  header: { width: 32, height: 32 },
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: number;
  animated?: boolean;
  glow?: boolean;
}

export function BrandLogo({
  variant = "header",
  size,
  animated = false,
  glow = false,
}: BrandLogoProps) {
  const dims = SIZES[variant];
  const w = size ?? dims.width;
  const h = size ?? dims.height;

  const floatY = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -5, duration: 2400, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ]),
    );
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.04, duration: 2600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 2600, useNativeDriver: true }),
      ]),
    );
    floatLoop.start();
    if (variant === "intro") breatheLoop.start();
    return () => {
      floatLoop.stop();
      breatheLoop.stop();
    };
  }, [animated, variant, floatY, breathe]);

  if (variant === "login") {
    const image = (
      <Image
        source={logoTransparent}
        style={{ width: w, height: h }}
        resizeMode="contain"
        accessibilityLabel="Healory logo"
      />
    );
    const content = (
      <View style={[styles.loginShadow, { width: w, height: h }]}>
        {image}
      </View>
    );
    if (!animated) return content;
    return (
      <Animated.View style={{ transform: [{ translateY: floatY }] }}>
        {content}
      </Animated.View>
    );
  }

  if (variant === "intro") {
    const transforms = [];
    if (animated) {
      transforms.push({ translateY: floatY });
      transforms.push({ scale: breathe });
    }
    return (
      <Animated.View
        style={[
          styles.introWrap,
          { width: w, height: h, transform: transforms.length ? transforms : undefined },
        ]}
      >
        {(glow || variant === "intro") && (
          <View
            pointerEvents="none"
            style={[
              styles.introGlow,
              { width: w * 1.35, height: h * 1.35, borderRadius: w * 0.68 },
            ]}
          />
        )}
        <View style={[styles.introShadow, { width: w, height: h }]}>
          <Image
            source={logoTransparent}
            style={{ width: w, height: h }}
            resizeMode="contain"
            accessibilityLabel="Healory logo"
          />
        </View>
      </Animated.View>
    );
  }

  return (
    <Image
      source={logoTransparent}
      style={[styles.base, { width: w, height: h }]}
      resizeMode="contain"
      accessibilityLabel="Healory logo"
    />
  );
}

const styles = StyleSheet.create({
  base: { flexShrink: 0 },
  loginShadow: {
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#0A3D62",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  introWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  introGlow: {
    position: "absolute",
    backgroundColor: "rgba(14,165,164,0.22)",
    ...Platform.select({
      ios: {
        shadowColor: "#0EA5A4",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 32,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  introShadow: {
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#0A3D62",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
});
