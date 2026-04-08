import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Image,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import { getBrand } from "@/constants/vehicleBrands";
import type { PatientTransport } from "@/hooks/guest/useGuestDashboard";

interface Props {
  transport: PatientTransport | null;
}

async function callPhone(phone: string | null | undefined) {
  if (!phone) {
    Alert.alert("No phone", "Driver phone number is not available.");
    return;
  }
  const url = `tel:${phone}`;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    Linking.openURL(url);
  } else {
    Alert.alert("Cannot call", "Your device cannot make phone calls.");
  }
}

export function TransportCard({ transport }: Props) {
  const brand = transport ? getBrand(transport.vehicleBrand) : null;
  const hasPhone = !!transport?.driverPhone;

  const vehicleDisplayName =
    transport
      ? [transport.vehicleBrand, transport.vehicleModel]
          .filter(Boolean)
          .join(" ") || transport.vehicleInfo || "Vehicle"
      : null;

  return (
    <LinearGradient
      colors={["#0D1117", "#161B27", "#1C2333"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Decorative gloss circle */}
      <View style={styles.glossCircle} />

      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <Ionicons name="car-sport-outline" size={13} color="rgba(255,255,255,0.5)" />
          <Text style={styles.cardLabel}>Transport</Text>
        </View>
        {brand && (
          <Image source={brand.logo} style={styles.brandLogo} resizeMode="contain" tintColor="#fff" />
        )}
      </View>

      {/* Content */}
      {!transport ? (
        <View style={styles.emptyBody}>
          <Ionicons name="car-outline" size={36} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTitle}>Transport not assigned yet</Text>
          <Text style={styles.emptySub}>Your clinic will update this soon.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.vehicleName}>{vehicleDisplayName}</Text>
          {transport.vehiclePlate ? (
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{transport.vehiclePlate}</Text>
            </View>
          ) : null}

          {/* Driver row */}
          {transport.driverName || transport.driverPhone ? (
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Ionicons name="person-outline" size={14} color="rgba(255,255,255,0.7)" />
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverLabel}>Driver</Text>
                <Text style={styles.driverName}>{transport.driverName ?? "—"}</Text>
              </View>
            </View>
          ) : null}

          {/* Meeting point */}
          {transport.meetingPointText ? (
            <View style={styles.meetRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.4)" />
              <Text style={styles.meetText} numberOfLines={2}>
                {transport.meetingPointText}
              </Text>
            </View>
          ) : null}

          {/* CTA buttons */}
          <View style={styles.ctaRow}>
            <Pressable
              style={[styles.callBtn, !hasPhone && styles.callBtnDisabled]}
              onPress={() => callPhone(transport.driverPhone)}
              disabled={!hasPhone}
            >
              <Ionicons
                name="call-outline"
                size={15}
                color={hasPhone ? "#0D1117" : "rgba(255,255,255,0.3)"}
              />
              <Text style={[styles.callBtnText, !hasPhone && styles.callBtnTextDisabled]}>
                Call Driver
              </Text>
            </Pressable>

            {transport.vehiclePlate ? (
              <Pressable
                style={styles.plateBtn}
                onPress={() => Alert.alert("Plate", transport.vehiclePlate ?? "")}
              >
                <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.6)" />
                <Text style={styles.plateBtnText}>Copy Plate</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: T.sp20,
    marginBottom: T.sp12,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  glossCircle: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  brandLogo: {
    width: 40,
    height: 40,
    opacity: 0.9,
  },
  emptyBody: {
    alignItems: "center",
    paddingVertical: T.sp24,
    gap: T.sp8,
  },
  emptyTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: "rgba(255,255,255,0.5)",
  },
  emptySub: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },
  vehicleName: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    marginBottom: T.sp8,
    letterSpacing: -0.5,
  },
  plateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: T.r8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: T.sp16,
  },
  plateText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 2,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: T.sp12,
    marginBottom: T.sp12,
  },
  driverAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  driverInfo: {},
  driverLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  driverName: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: "rgba(255,255,255,0.9)",
  },
  meetRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: T.sp16,
  },
  meetText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    flex: 1,
    lineHeight: 16,
  },
  ctaRow: {
    flexDirection: "row",
    gap: T.sp8,
    marginTop: T.sp8,
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: T.r10,
    paddingVertical: 13,
    paddingHorizontal: T.sp16,
  },
  callBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  callBtnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 14,
    color: "#0D1117",
  },
  callBtnTextDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  plateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: T.r10,
    paddingVertical: 13,
    paddingHorizontal: T.sp12,
  },
  plateBtnText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
});
