import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface FilterButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  active?: boolean;
  onPress: () => void;
}

export function FilterButton({ icon, label, value, active, onPress }: FilterButtonProps) {
  const shown = value ?? label;
  const isActive = active || !!value;
  return (
    <Pressable
      onPress={onPress}
      style={[s.btn, isActive ? s.btnActive : s.btnIdle]}
    >
      <Ionicons
        name={icon}
        size={13}
        color={isActive ? T.primary : T.textSec}
      />
      <Text style={[s.label, { color: isActive ? T.primary : T.textSec }]} numberOfLines={1}>
        {shown}
      </Text>
      <Ionicons name="chevron-down" size={11} color={isActive ? T.primary : T.textMuted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    maxWidth: 160,
  },
  btnIdle: {
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  btnActive: {
    borderColor: T.primary + "60",
    backgroundColor: T.primary + "08",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
    flexShrink: 1,
  },
});
