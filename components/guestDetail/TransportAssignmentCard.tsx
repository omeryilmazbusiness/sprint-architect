import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { VehicleBrandLogo } from "@/components/brands/VehicleBrandLogo";

interface TransportData {
  id: string;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  licensePlate: string | null;
  driverFullName: string | null;
  driverPhoneE164: string | null;
}

interface Props {
  transport: TransportData | null;
  onAssign: () => void;
  onClear?: () => void;
}

export function TransportAssignmentCard({ transport, onAssign, onClear }: Props) {
  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="car-outline" size={16} color={T.accent} />
          <Text style={styles.title}>Transport</Text>
        </View>
        <Pressable onPress={onAssign} style={styles.editBtn}>
          <Ionicons
            name={transport ? "pencil-outline" : "add"}
            size={16}
            color={T.accent}
          />
          <Text style={styles.editBtnText}>{transport ? "Change" : "Assign"}</Text>
        </Pressable>
      </View>

      {transport ? (
        <View style={styles.content}>
          <VehicleBrandLogo brand={transport.vehicleBrand} size={56} />
          <View style={styles.info}>
            <Text style={styles.vehicleName}>
              {[transport.vehicleBrand, transport.vehicleModel]
                .filter(Boolean)
                .join(" ") || "Transport"}
            </Text>
            {transport.licensePlate && (
              <View style={styles.plateChip}>
                <Text style={styles.plateText}>{transport.licensePlate}</Text>
              </View>
            )}
            {transport.driverFullName && (
              <Text style={styles.driverName}>
                <Ionicons name="person-outline" size={12} color={T.textMuted} />{" "}
                {transport.driverFullName}
              </Text>
            )}
            {transport.driverPhoneE164 && (
              <Pressable
                onPress={() =>
                  Linking.openURL(`tel:${transport.driverPhoneE164}`).catch(() => null)
                }
                style={styles.phoneRow}
              >
                <Ionicons name="call-outline" size={12} color={T.accent} />
                <Text style={styles.phoneText}>{transport.driverPhoneE164}</Text>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <Pressable onPress={onAssign} style={styles.emptyState}>
          <Ionicons name="car-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>No transport assigned</Text>
          <Text style={styles.emptyHint}>Tap Assign to add a vehicle</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    padding: T.sp20,
    marginBottom: T.sp12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp16,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    color: T.text,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: T.r8,
    borderWidth: 1,
    borderColor: T.border,
  },
  editBtnText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.accent,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: T.sp16,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  vehicleName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 18,
    color: T.text,
  },
  plateChip: {
    alignSelf: "flex-start",
    backgroundColor: T.surfaceSubtle,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  plateText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    color: T.text,
    letterSpacing: 1.5,
  },
  driverName: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: T.textSec,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  phoneText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: T.accent,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: T.sp24,
    gap: 6,
  },
  emptyText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: T.textSec,
  },
  emptyHint: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: T.textMuted,
  },
});
