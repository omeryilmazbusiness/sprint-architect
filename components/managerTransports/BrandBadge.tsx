import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { getBrand } from "@/constants/vehicleBrands";

interface BrandBadgeProps {
  brand: string | null | undefined;
  size?: number;
}

export function BrandBadge({ brand, size = 44 }: BrandBadgeProps) {
  const b = getBrand(brand);
  const fontSize = Math.round(size * 0.42);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: b?.color ?? "#6B7280",
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize, color: b?.textColor ?? "#FFFFFF" }]}>
        {b?.initial ?? (brand?.[0] ?? "?")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
