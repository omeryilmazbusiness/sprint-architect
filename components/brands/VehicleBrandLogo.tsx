import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
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
  const padding = Math.round(size * 0.1);

  if (!b) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
      >
        <Ionicons name="car-outline" size={Math.round(size * 0.55)} color="#9CA3AF" />
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
          padding,
        },
      ]}
    >
      <Image
        source={b.logo}
        style={{ width: size - padding * 2, height: size - padding * 2 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
});
