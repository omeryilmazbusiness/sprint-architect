import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { COUNTRIES, CountryInfo, getCountryByCode, toE164 } from "@/services/phoneFormatter";

// ─── Country Picker Modal ─────────────────────────────────────────────────────
// Module-level component — never defined inside parent to avoid focus loss.

type CountryPickerModalProps = {
  visible: boolean;
  selected: string;
  onSelect: (country: CountryInfo) => void;
  onClose: () => void;
};

function CountryRow({
  item,
  isSelected,
  onPress,
}: {
  item: CountryInfo;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.countryRow, pressed && { backgroundColor: T.surfaceSubtle }]}
      onPress={onPress}
    >
      <Text style={styles.countryFlag}>{item.flag}</Text>
      <Text style={styles.countryName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.countryDial}>{item.dialCode}</Text>
      {isSelected && <Ionicons name="checkmark" size={16} color={T.primary} />}
    </Pressable>
  );
}

function CountryPickerModal({ visible, selected, onSelect, onClose }: CountryPickerModalProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRIES;

  function handleSelect(country: CountryInfo) {
    onSelect(country);
    setSearch("");
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.cpOverlay}>
        <View style={styles.cpSheet}>
          <View style={styles.cpHandle} />
          <View style={styles.cpHeaderRow}>
            <Text style={styles.cpTitle}>Select Country</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={T.textSec} />
            </Pressable>
          </View>

          <View style={styles.cpSearch}>
            <Ionicons name="search-outline" size={16} color={T.textMuted} />
            <TextInput
              style={styles.cpSearchInput}
              placeholder="Search country or dial code…"
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={T.textMuted} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cpList}
            renderItem={({ item }) => (
              <CountryRow
                item={item}
                isSelected={item.code === selected}
                onPress={() => handleSelect(item)}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Phone Picker Input ───────────────────────────────────────────────────────

export type PhonePickerValue = {
  raw: string;
  e164: string | null;
  countryCode: string;
};

type PhonePickerInputProps = {
  value: PhonePickerValue;
  onChange: (val: PhonePickerValue) => void;
  testID?: string;
  hasError?: boolean;
};

export const PhonePickerInput = React.forwardRef<TextInput, PhonePickerInputProps>(
  ({ value, onChange, testID, hasError }, ref) => {
    const [pickerOpen, setPickerOpen] = useState(false);
    const country = getCountryByCode(value.countryCode);

    const handleTextChange = useCallback(
      (text: string) => {
        const e164 = toE164(text, country.dialCode);
        onChange({ raw: text, e164, countryCode: value.countryCode });
      },
      [country.dialCode, value.countryCode, onChange],
    );

    const handleCountrySelect = useCallback(
      (c: CountryInfo) => {
        const e164 = toE164(value.raw, c.dialCode);
        onChange({ raw: value.raw, e164, countryCode: c.code });
      },
      [value.raw, onChange],
    );

    return (
      <View style={[styles.container, hasError && styles.containerError]}>
        <Pressable
          testID={`${testID}-country`}
          style={({ pressed }) => [styles.countryBtn, pressed && { opacity: 0.7 }]}
          onPress={() => setPickerOpen(true)}
        >
          <Text style={styles.flagText}>{country.flag}</Text>
          <Text style={styles.dialCode}>{country.dialCode}</Text>
          <Ionicons name="chevron-down" size={12} color={T.textMuted} />
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          ref={ref}
          testID={testID}
          style={styles.phoneInput}
          value={value.raw}
          onChangeText={handleTextChange}
          placeholder="Phone number"
          placeholderTextColor={T.textMuted}
          keyboardType="phone-pad"
          returnKeyType="done"
          autoCapitalize="none"
        />

        <CountryPickerModal
          visible={pickerOpen}
          selected={value.countryCode}
          onSelect={handleCountrySelect}
          onClose={() => setPickerOpen(false)}
        />
      </View>
    );
  },
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: T.r10,
    backgroundColor: T.surface,
    minHeight: 46,
    overflow: "hidden",
  },
  containerError: { borderColor: T.danger },

  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.surfaceSubtle,
  },
  flagText: { fontSize: 18 },
  dialCode: { fontFamily: "PlusJakartaSans_500Medium", fontSize: 13, color: T.text },

  divider: { width: 1, height: 28, backgroundColor: T.border },

  phoneInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
  },

  cpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  cpSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 30 : 20,
  },
  cpHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  cpHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  cpTitle: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 16, color: T.text },
  cpSearch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  cpSearchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
  },
  cpList: { paddingBottom: 20 },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.border,
  },
  countryFlag: { fontSize: 22 },
  countryName: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
  },
  countryDial: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 14,
    color: T.textSec,
  },
});
