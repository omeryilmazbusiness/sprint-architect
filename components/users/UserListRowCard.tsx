import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import type { UnifiedEntity } from "@/lib/api/adminUsers";

function entityColor(type: string): string {
  if (type === "PATIENT") return T.accent;
  if (type === "ADMIN") return "#7C3AED";
  return T.primary;
}

function entityLabel(type: string): string {
  if (type === "PATIENT") return "Patient";
  if (type === "ADMIN") return "Admin";
  return "Manager";
}

function statusColor(status: string): string {
  if (status === "ACTIVE") return T.success;
  if (status === "INACTIVE") return T.textMuted;
  if (status === "SUSPENDED") return T.danger;
  return T.textMuted;
}

function statusLabel(status: string): string {
  if (status === "ACTIVE") return "Active";
  if (status === "INACTIVE") return "Inactive";
  if (status === "SUSPENDED") return "Suspended";
  if (status === "PENDING") return "Pending";
  if (status === "APPROVED") return "Approved";
  if (status === "ENDED") return "Ended";
  return status;
}

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function Checkbox({ checked, color }: { checked: boolean; color: string }) {
  return (
    <View
      style={[
        styles.checkbox,
        {
          borderColor: checked ? color : T.borderStrong,
          backgroundColor: checked ? color : "transparent",
        },
      ]}
    >
      {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
    </View>
  );
}

interface Props {
  item: UnifiedEntity;
  selectionMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export function UserListRowCard({
  item,
  selectionMode,
  isSelected,
  onPress,
  onLongPress,
}: Props) {
  const color = entityColor(item.entityType);
  const statColor = statusColor(item.status);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        cardShadow,
        isSelected && styles.cardSelected,
        { opacity: pressed ? 0.85 : 1 },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <View style={[styles.avatar, { backgroundColor: color + "12" }]}>
        <Text style={[styles.avatarText, { color }]}>
          {item.displayName.slice(0, 2).toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.displayName}
        </Text>
        {item.email && item.email !== item.displayName && (
          <Text style={styles.email} numberOfLines={1}>
            {item.email}
          </Text>
        )}
        <View style={styles.chips}>
          {item.clinicName ? (
            <Chip
              label={item.clinicName}
              color={T.accent}
              bg={T.accent + "12"}
            />
          ) : (
            <Chip label="Admin" color="#7C3AED" bg="#7C3AED12" />
          )}
          <Chip label={entityLabel(item.entityType)} color={color} bg={color + "12"} />
          <Chip
            label={statusLabel(item.status)}
            color={statColor}
            bg={statColor + "15"}
          />
        </View>
      </View>

      <View style={styles.right}>
        {selectionMode ? (
          <Checkbox checked={isSelected} color={color} />
        ) : (
          item.entityType !== "PATIENT" && (
            <Ionicons name="chevron-forward" size={14} color={T.textMuted} />
          )
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: T.r14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 12,
  },
  cardSelected: {
    borderColor: T.accent,
    backgroundColor: T.accent + "06",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  info: { flex: 1, gap: 3 },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: T.text,
    lineHeight: 20,
  },
  email: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    color: T.textMuted,
    marginTop: -1,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: T.r6,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.2,
  },
  right: { flexShrink: 0, alignItems: "center", justifyContent: "center" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
