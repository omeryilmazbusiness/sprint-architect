import React, { useState } from "react";
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
import { COUNTRIES } from "@/services/phoneFormatter";
import type { CreateGuestDict } from "@/i18n/types";

type Props = {
  visible: boolean;
  labels: CreateGuestDict;
  onSelect: (code: string, name: string, flag: string) => void;
  onClose: () => void;
};

export function NationalityPickerModal({ visible, labels, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()),
      )
    : COUNTRIES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{labels.nationalityTitle}</Text>
          <Pressable
            onPress={() => {
              onClose();
              setSearch("");
            }}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={T.text} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color={T.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={labels.searchCountryPlaceholder}
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.code}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: c }) => (
            <Pressable
              style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => {
                onSelect(c.code, c.name, c.flag);
                onClose();
                setSearch("");
              }}
            >
              <Text style={styles.flag}>{c.flag}</Text>
              <Text style={styles.countryName}>{c.name}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: 0.5, backgroundColor: T.border, marginLeft: 52 }} />
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    ...Platform.select({ web: { paddingTop: 24 } }),
  },
  title: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 17, color: T.text },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
    padding: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  flag: { fontSize: 22, width: 32, textAlign: "center" },
  countryName: {
    flex: 1,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: T.text,
  },
});
