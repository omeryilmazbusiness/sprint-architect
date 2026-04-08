import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

export type ChipVariant = "primary" | "warn" | "accent";

export interface ActiveChip {
  key: string;
  label: string;
  variant?: ChipVariant;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveChip[];
  onClearAll?: () => void;
}

const VARIANT_STYLES: Record<
  ChipVariant,
  { bg: string; border: string; text: string; icon: string }
> = {
  primary: { bg: T.primary + "10", border: T.primary + "30", text: T.primary, icon: T.primary },
  warn: { bg: T.warning + "12", border: T.warning + "35", text: T.warning, icon: T.warning },
  accent: { bg: T.accent + "12", border: T.accent + "30", text: T.accent, icon: T.accent },
};

export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <View style={s.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {chips.map((chip) => {
          const v = VARIANT_STYLES[chip.variant ?? "primary"];
          return (
            <Pressable
              key={chip.key}
              onPress={chip.onRemove}
              style={({ pressed }) => [
                s.chip,
                { backgroundColor: v.bg, borderColor: v.border },
                { opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[s.chipText, { color: v.text }]} numberOfLines={1}>
                {chip.label}
              </Text>
              <Ionicons name="close" size={13} color={v.icon} />
            </Pressable>
          );
        })}
        {onClearAll && chips.length > 1 && (
          <Pressable
            style={({ pressed }) => [s.clearBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onClearAll}
          >
            <Ionicons name="close-circle" size={13} color={T.danger} />
            <Text style={s.clearText}>Clear all</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
  },
  scroll: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    maxWidth: 140,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 12,
    color: T.danger,
  },
});
