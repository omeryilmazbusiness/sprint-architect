import React from "react";
import { View, Text, Image, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T, cardShadow } from "@/constants/adminTheme";
import { getBrand } from "@/constants/vehicleBrands";
import type { PatientTransport } from "@/hooks/guest/useGuestDashboard";

interface Props {
  transport: PatientTransport | null;
}

export function TransportCard({ transport }: Props) {
  const brand = transport ? getBrand(transport.vehicleBrand) : null;

  const callDriver = () => {
    if (transport?.driverPhone) Linking.openURL(`tel:${transport.driverPhone}`);
  };

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <Ionicons name="car-outline" size={16} color={T.accent} />
        <Text style={styles.label}>Transport</Text>
      </View>

      {!transport ? (
        <View style={styles.empty}>
          <Ionicons name="car-outline" size={32} color={T.textMuted} />
          <Text style={styles.emptyText}>No transport assigned</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.vehicleRow}>
            {brand ? (
              <Image source={brand.logo} style={styles.brandLogo} resizeMode="contain" />
            ) : (
              <View style={[styles.brandFallback, { backgroundColor: T.inactiveBg }]}>
                <Ionicons name="car-sport-outline" size={24} color={T.textSec} />
              </View>
            )}
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>
                {[transport.vehicleBrand, transport.vehicleModel].filter(Boolean).join(" ") ||
                  transport.vehicleInfo ||
                  "Vehicle"}
              </Text>
              {transport.vehiclePlate ? (
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{transport.vehiclePlate}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {transport.driverName || transport.driverPhone ? (
            <View style={styles.driverRow}>
              <Ionicons name="person-outline" size={14} color={T.textSec} />
              <Text style={styles.driverName}>{transport.driverName ?? "Driver"}</Text>
              {transport.driverPhone ? (
                <Pressable onPress={callDriver} style={styles.callBtn} hitSlop={8}>
                  <Ionicons name="call-outline" size={14} color={T.accent} />
                  <Text style={styles.callText}>{transport.driverPhone}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {transport.meetingPointText ? (
            <View style={styles.meetingRow}>
              <Ionicons name="location-outline" size={14} color={T.textSec} />
              <Text style={styles.meetingText} numberOfLines={2}>
                {transport.meetingPointText}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: T.r16,
    borderWidth: 1,
    borderColor: T.border,
    padding: T.sp16,
    marginBottom: T.sp12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: T.sp12,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    alignItems: "center",
    paddingVertical: T.sp16,
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: T.textMuted,
  },
  body: { gap: T.sp12 },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
  },
  brandLogo: { width: 48, height: 48 },
  brandFallback: {
    width: 48,
    height: 48,
    borderRadius: T.r10,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleInfo: { flex: 1 },
  vehicleName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: T.text,
    marginBottom: 4,
  },
  plateBadge: {
    alignSelf: "flex-start",
    backgroundColor: T.primary,
    borderRadius: T.r6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  plateText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#fff",
    letterSpacing: 1,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  driverName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: T.text,
    flex: 1,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.successBg,
    borderRadius: T.r8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  callText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: T.accent,
  },
  meetingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  meetingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
    lineHeight: 18,
  },
});
