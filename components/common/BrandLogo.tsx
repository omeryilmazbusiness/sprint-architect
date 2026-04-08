import React from "react";
import { Image, Platform, StyleSheet, View } from "react-native";

// Static require — Metro bundles the asset for iOS, Android, and web.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require("@/assets/images/logo.png") as number;

export type BrandLogoVariant = "login" | "header";

/**
 * Dimensions chosen for each variant:
 *   login  — 96×96: large enough to anchor the hero area without dominating it.
 *             The transparent logo needs slightly more space than an opaque icon
 *             would, because there is no solid container to give it visual weight.
 *   header — 32×32: compact brand mark that matches icon button height in all
 *             three app headers (AdminHeader / ManagerHeader). Keeps the header
 *             row balanced on a 375pt screen.
 */
const SIZES: Record<BrandLogoVariant, { width: number; height: number }> = {
  login: { width: 96, height: 96 },
  header: { width: 32, height: 32 },
};

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  /**
   * Override the square size.  Both width and height are set to this value;
   * resizeMode="contain" keeps the image's native aspect ratio.
   */
  size?: number;
}

/**
 * Healory brand logo — single source of truth for the logo asset.
 *
 *   <BrandLogo variant="login"  /> — auth screen hero (96×96 + subtle shadow)
 *   <BrandLogo variant="header" /> — compact mark in Admin / Manager headers
 */
export function BrandLogo({ variant = "header", size }: BrandLogoProps) {
  const dims = SIZES[variant];
  const w = size ?? dims.width;
  const h = size ?? dims.height;

  if (variant === "login") {
    // Wrap in a View so we can apply a shadow on iOS without affecting the
    // transparent pixels of the image itself.  Android uses `elevation`.
    return (
      <View style={[styles.loginShadow, { width: w, height: h }]}>
        <Image
          source={logoSource}
          style={{ width: w, height: h }}
          resizeMode="contain"
          accessibilityLabel="Healory logo"
        />
      </View>
    );
  }

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
  loginShadow: {
    flexShrink: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#0A3D62",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
});
