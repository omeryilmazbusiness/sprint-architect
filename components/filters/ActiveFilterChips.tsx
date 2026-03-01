import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

export interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveChip[];
  onClearAll?: () => void;
}

export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;
  return (
    <View style={s.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        {chips.map((chip) => (
          <View key={chip.key} style={s.chip}>
            <Text style={s.chipText} numberOfLines={1}>{chip.label}</Text>
            <Pressable onPress={chip.onRemove} hitSlop={6}>
              <Ionicons name="close" size={13} color={T.primary} />
            </Pressable>
          </View>
        ))}
        {onClearAll && chips.length > 1 && (
          <Pressable style={s.clearBtn} onPress={onClearAll}>
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
    backgroundColor: T.primary + "10",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.primary + "30",
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.primary,
    maxWidth: 140,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: T.textSec,
    textDecorationLine: "underline",
  },
});
