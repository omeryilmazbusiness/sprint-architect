import React from "react";
import { View, Text, StyleSheet, useColorScheme, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

interface AppFooterProps {
  version?: string;
}

export function AppFooter({ version = "1.0.0" }: AppFooterProps) {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { borderTopColor: colors.border, paddingBottom: bottomPad + 8 }]}>
      <Text style={[styles.brand, { color: colors.textMuted, fontFamily: "Inter_600SemiBold" }]}>
        HealthTour
      </Text>
      <Text style={[styles.meta, { color: colors.textMuted, fontFamily: "Inter_400Regular" }]}>
        Operations Platform · v{version}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  brand: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 11,
  },
});
