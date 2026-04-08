import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: string;
  trendPositive?: boolean;
  accent?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  trend,
  trendPositive,
  accent,
}: MetricCardProps) {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const iconColor = accent ?? colors.accent;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: iconColor + "18" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: colors.text, fontFamily: "PlusJakartaSans_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "PlusJakartaSans_400Regular" }]}>
        {label}
      </Text>
      {trend ? (
        <Text
          style={[
            styles.trend,
            {
              color: trendPositive ? colors.success : colors.error,
              fontFamily: "PlusJakartaSans_500Medium",
            },
          ]}
        >
          {trendPositive ? "↑" : "↓"} {trend}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 6,
    minWidth: 140,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: {
    fontSize: 28,
    lineHeight: 32,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
  trend: {
    fontSize: 11,
    marginTop: 2,
  },
});
