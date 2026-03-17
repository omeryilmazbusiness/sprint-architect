import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBrand, type VehicleBrandKey } from "@/constants/vehicleBrands";

interface VehicleBrandLogoProps {
  brand: VehicleBrandKey | string | null | undefined;
  size?: number;
  rounded?: boolean;
}

export function VehicleBrandLogo({ brand, size = 44, rounded = true }: VehicleBrandLogoProps) {
  const b = getBrand(brand);
  const radius = rounded ? size * 0.22 : 6;
  const fontSize = Math.round(size * 0.4);

  if (!b) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: "#9CA3AF",
          },
        ]}
      >
        <Ionicons name="car-outline" size={Math.round(size * 0.55)} color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: b.color,
        },
      ]}
    >
      <Image
        source={b.logo}
        style={[
          styles.logoImage,
          { width: size, height: size, borderRadius: radius },
        ]}
        resizeMode="cover"
      />
      <Text
        style={[
          styles.initial,
          {
            fontSize,
            color: b.textColor,
          },
        ]}
        numberOfLines={1}
      >
        {b.initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    position: "absolute",
    top: 0,
    left: 0,
    opacity: 0.25,
  },
  initial: {
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
