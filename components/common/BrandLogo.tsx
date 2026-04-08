import React from "react";
import { Image, StyleSheet } from "react-native";

// Static require so Metro bundles the asset correctly on both iOS and Android.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require("@/assets/images/logo.png") as number;

export type BrandLogoVariant = "login" | "header";

const SIZES: Record<BrandLogoVariant, { width: number; height: number }> = {
  login: { width: 88, height: 88 },
  header: { width: 32, height: 32 },
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  /** Override width only (height auto-scales via resizeMode="contain"). */
  size?: number;
}

/**
 * Healory brand logo — single source of truth for the logo asset.
 * Use variant="login" for the auth screen hero; variant="header" for
 * the compact brand mark in app headers.
 */
export function BrandLogo({ variant = "header", size }: BrandLogoProps) {
  const dims = SIZES[variant];
  const w = size ?? dims.width;
  const h = size ?? dims.height;

  return (
    <Image
      source={logoSource}
      style={[styles.base, { width: w, height: h }]}
      resizeMode="contain"
      accessibilityLabel="Healory logo"
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 0,
  },
});
