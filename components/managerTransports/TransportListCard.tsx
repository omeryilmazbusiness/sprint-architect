import React from "react";
import { View, Text, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { VehicleBrandLogo } from "@/components/brands/VehicleBrandLogo";
import { getBrand } from "@/constants/vehicleBrands";

export interface TransportItem {
  id: string;
  driverFullName: string;
  driverPhoneE164: string;
  vehicleBrand: string;
  vehicleModel: string;
  licensePlate: string;
  vehicleColor?: string | null;
  createdAt?: string;
}

interface TransportListCardProps {
  item: TransportItem;
  onEdit: (item: TransportItem) => void;
  onDelete: (id: string) => void;
}

export function TransportListCard({ item, onEdit, onDelete }: TransportListCardProps) {
  const brand = getBrand(item.vehicleBrand);
  const displayBrand = brand?.label ?? item.vehicleBrand;
  const displayModel = item.vehicleModel ?? "";

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Remove ${item.driverFullName}?`)) {
        onDelete(item.id);
      }
    } else {
      Alert.alert(
        "Delete Transport",
        `Remove ${item.driverFullName}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => onDelete(item.id) },
        ]
      );
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardShadow, { opacity: pressed ? 0.92 : 1 }]}
      onPress={() => onEdit(item)}
    >
      <View style={styles.topRow}>
        <VehicleBrandLogo brand={item.vehicleBrand} size={48} />

        <View style={styles.info}>
          <Text style={styles.brandModel} numberOfLines={1}>
            {displayBrand}{displayModel ? ` ${displayModel}` : ""}
          </Text>
          <Text style={styles.plate} numberOfLines={1}>
            {item.licensePlate || "—"}
          </Text>
        </View>

        <Pressable onPress={handleDelete} hitSlop={10} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={T.danger} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.driverRow}>
        <Ionicons name="person-outline" size={14} color={T.textMuted} style={{ marginRight: 6 }} />
        <Text style={styles.driverName} numberOfLines={1}>
          {item.driverFullName || "Unknown Driver"}
        </Text>
        {!!item.driverPhoneE164 && (
          <View style={styles.phoneChip}>
            <Ionicons name="call-outline" size={12} color={T.accent} style={{ marginRight: 3 }} />
            <Text style={styles.phoneText}>{item.driverPhoneE164}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8ECF0",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  brandModel: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans_700Bold",
    color: T.text,
    letterSpacing: -0.3,
  },
  plate: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: T.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  deleteBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F2F5",
    marginVertical: 12,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  driverName: {
    flex: 1,
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    color: T.text,
  },
  phoneChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  phoneText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: T.accent,
  },
});
