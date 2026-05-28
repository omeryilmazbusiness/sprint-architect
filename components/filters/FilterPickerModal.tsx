import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { CenteredAppModal } from "@/components/modals/CenteredAppModal";

export interface PickerOption {
  label: string;
  value: string;
  subtitle?: string;
}

interface FilterPickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
  allLabel?: string;
}

export function FilterPickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchable = false,
  allLabel = "All",
}: FilterPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle ?? "").toLowerCase().includes(q)
    );
  }, [options, search]);

  function handleSelect(val: string) {
    onSelect(val);
    setSearch("");
    onClose();
  }

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <CenteredAppModal
      visible={visible}
      onClose={handleClose}
      title={title}
      scroll={false}
      bodyMinHeight={280}
      testID="filter-picker-modal"
    >
      {searchable && (
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={15} color={T.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search…"
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={T.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.value}
        style={s.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        ListHeaderComponent={
          search.length === 0 ? (
            <Pressable style={s.optionRow} onPress={() => handleSelect("")}>
              <View style={s.optionText}>
                <Text style={[s.optionLabel, !selected ? s.optionLabelActive : null]}>{allLabel}</Text>
              </View>
              {!selected && <Ionicons name="checkmark" size={18} color={T.primary} />}
            </Pressable>
          ) : null
        }
        renderItem={({ item }) => {
          const isActive = selected === item.value;
          return (
            <Pressable
              style={[s.optionRow, isActive && s.optionRowActive]}
              onPress={() => handleSelect(item.value)}
            >
              <View style={s.optionText}>
                <Text style={[s.optionLabel, isActive && s.optionLabelActive]}>{item.label}</Text>
                {item.subtitle ? (
                  <Text style={s.optionSub} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
              {isActive && <Ionicons name="checkmark" size={18} color={T.primary} />}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={s.empty}>No results</Text>}
        contentContainerStyle={s.listContent}
      />
    </CenteredAppModal>
  );
}

const s = StyleSheet.create({
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: T.surfaceSubtle,
    borderRadius: T.r10,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.text,
  },
  list: { flex: 1, width: "100%" },
  listContent: { paddingBottom: 12 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  optionRowActive: { backgroundColor: T.primary + "06" },
  optionText: { flex: 1 },
  optionLabel: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 15,
    color: T.text,
  },
  optionLabelActive: {
    color: T.primary,
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  optionSub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  empty: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
    paddingVertical: 24,
  },
});
