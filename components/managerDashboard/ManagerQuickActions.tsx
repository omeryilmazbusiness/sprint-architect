import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { T, softShadow } from "@/constants/adminTheme";
import { useT } from "@/hooks/useT";

interface ActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function ActionChip({ icon, label, color, bgColor, onPress }: ActionItem) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        softShadow,
        { opacity: pressed ? 0.78 : 1 },
      ]}
      onPress={onPress}
      testID={`quick-action-${label}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export function ManagerQuickActions() {
  const t = useT();
  const td = t.managerDashboard;

  const actions: ActionItem[] = [
    {
      icon: "person-add-outline",
      label: td.qaNewGuest,
      color: "#6366F1",
      bgColor: "#6366F115",
      onPress: () =>
        router.push({
          pathname: "/(manager-tabs)/users",
          params: { openCreate: "1" },
        }),
    },
    {
      icon: "document-text-outline",
      label: td.qaDocTypes,
      color: T.warning,
      bgColor: T.warning + "15",
      onPress: () => router.push("/(manager)/document-types"),
    },
    {
      icon: "people-outline",
      label: td.qaAllGuests,
      color: T.primary,
      bgColor: T.primary + "14",
      onPress: () => router.push("/(manager-tabs)/users"),
    },
    {
      icon: "layers-outline",
      label: td.qaServices,
      color: "#2ECF8F",
      bgColor: "#2ECF8F15",
      onPress: () => router.push("/(manager-tabs)/services"),
    },
    {
      icon: "receipt-outline",
      label: td.qaInvoices,
      color: "#E3485B",
      bgColor: "#E3485B15",
      onPress: () => router.push("/(manager-tabs)/invoices"),
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {actions.map((a) => (
        <ActionChip key={a.label} {...a} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingRight: T.sp16,
  },
  chip: {
    backgroundColor: T.surface,
    borderRadius: T.r12,
    paddingVertical: T.sp12,
    paddingHorizontal: T.sp12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: T.border,
    minWidth: 72,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: T.r12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: T.text,
    textAlign: "center",
  },
});
