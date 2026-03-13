import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";

interface Props {
  count: number;
  total: number;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onCancel: () => void;
}

export function SelectionToolbar({
  count,
  total,
  onDeleteSelected,
  onSelectAll,
  onCancel,
}: Props) {
  const canDelete = count > 0;
  const allSelected = count === total && total > 0;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad + 12 }]}>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={onCancel}
        >
          <Ionicons name="close" size={16} color={T.textSec} />
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <Text style={styles.count}>
          {count > 0 ? `${count} selected` : "Tap to select"}
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.selectAllBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onSelectAll}
          >
            <Text style={styles.selectAllText}>
              {allSelected ? "None" : "All"}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.deleteBtn,
              !canDelete && styles.deleteBtnDisabled,
              { opacity: pressed && canDelete ? 0.8 : 1 },
            ]}
            onPress={canDelete ? onDeleteSelected : undefined}
            disabled={!canDelete}
          >
            <Ionicons
              name="trash-outline"
              size={15}
              color={canDelete ? "#fff" : T.textMuted}
            />
            <Text style={[styles.deleteText, !canDelete && styles.deleteTextDisabled]}>
              Deactivate
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
  },
  cancelText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  count: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: T.text,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.accent + "40",
    backgroundColor: T.accent + "08",
  },
  selectAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: T.accent,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: T.r8,
    backgroundColor: T.danger,
  },
  deleteBtnDisabled: {
    backgroundColor: T.border,
  },
  deleteText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  deleteTextDisabled: {
    color: T.textMuted,
  },
});
