import React from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import Colors from "@/constants/colors";

type Status = "ACTIVE" | "INACTIVE" | "PENDING" | "CONFIRMED" | "SCHEDULED" | "COMPLETED" | "SUSPENDED";

interface StatusBadgeProps {
  status: Status;
  small?: boolean;
}

const STATUS_CONFIG: Record<Status, { label: string; colorKey: "statusActive" | "statusInactive" | "statusPending" | "warning" }> = {
  ACTIVE: { label: "Active", colorKey: "statusActive" },
  INACTIVE: { label: "Inactive", colorKey: "statusInactive" },
  PENDING: { label: "Pending", colorKey: "statusPending" },
  CONFIRMED: { label: "Confirmed", colorKey: "statusActive" },
  SCHEDULED: { label: "Scheduled", colorKey: "statusPending" },
  COMPLETED: { label: "Completed", colorKey: "statusInactive" },
  SUSPENDED: { label: "Suspended", colorKey: "statusInactive" },
};

export function StatusBadge({ status, small }: StatusBadgeProps) {
  const isDark = useColorScheme() === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const config = STATUS_CONFIG[status] ?? { label: status, colorKey: "statusInactive" as const };
  const color = colors[config.colorKey];

  return (
    <View style={[styles.badge, { backgroundColor: color + "1A" }, small && styles.small]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.text,
          { color, fontFamily: "PlusJakartaSans_600SemiBold" },
          small && styles.smallText,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  smallText: {
    fontSize: 10,
  },
});
