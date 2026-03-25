import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T } from "@/constants/adminTheme";
import type { PatientHotel } from "@/hooks/guest/useGuestDashboard";

function fmtDate(s: string | null | undefined) {
  if (!s) return null;
  return new Date(s).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function callPhone(phone: string | null | undefined) {
  if (!phone) {
    Alert.alert("No phone", "Hotel phone number is not available.");
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

interface Props {
  hotel: PatientHotel | null;
}

export function HotelCard({ hotel }: Props) {
  return (
    <LinearGradient
      colors={["#FFFFFF", "#F0F7FF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Decorative arc */}
      <View style={styles.arcDecor} />

      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <Ionicons name="bed-outline" size={13} color={T.accent} />
          <Text style={styles.cardLabel}>Hotel</Text>
        </View>
        <View style={styles.hotelIcon}>
          <Ionicons name="business-outline" size={18} color={T.accent} />
        </View>
      </View>

      {!hotel ? (
        <View style={styles.emptyBody}>
          <Ionicons name="bed-outline" size={34} color={T.border} />
          <Text style={styles.emptyTitle}>Hotel not assigned yet</Text>
          <Text style={styles.emptySub}>Your clinic will update this soon.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.hotelName}>{hotel.name}</Text>

          {hotel.address ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={T.textSec} />
              <Text style={styles.infoText} numberOfLines={2}>{hotel.address}</Text>
            </View>
          ) : null}

          {hotel.roomNo ? (
            <View style={styles.infoRow}>
              <Ionicons name="key-outline" size={14} color={T.textSec} />
              <Text style={styles.infoText}>Room {hotel.roomNo}</Text>
            </View>
          ) : null}

          {(hotel.checkInDate || hotel.checkOutDate) ? (
            <View style={styles.stayRow}>
              <View style={styles.stayItem}>
                <Text style={styles.stayLabel}>Check-in</Text>
                <Text style={styles.stayDate}>{fmtDate(hotel.checkInDate) ?? "—"}</Text>
              </View>
              <View style={styles.stayDivider} />
              <View style={styles.stayItem}>
                <Text style={styles.stayLabel}>Check-out</Text>
                <Text style={styles.stayDate}>{fmtDate(hotel.checkOutDate) ?? "—"}</Text>
              </View>
              {hotel.stayDays ? (
                <>
                  <View style={styles.stayDivider} />
                  <View style={styles.stayItem}>
                    <Text style={styles.stayLabel}>Nights</Text>
                    <Text style={[styles.stayDate, { color: T.accent }]}>{hotel.stayDays}</Text>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          <Pressable
            style={styles.callBtn}
            onPress={() => callPhone((hotel as any).phone ?? null)}
          >
            <Ionicons name="call-outline" size={15} color={T.accent} />
            <Text style={styles.callBtnText}>Call Hotel</Text>
          </Pressable>
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
    borderWidth: 1,
    borderColor: "#DDE8F5",
    position: "relative",
    ...Platform.select({
      ios: {
        shadowColor: "#0369A1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  arcDecor: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(3,105,161,0.05)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.sp12,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hotelIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(3,105,161,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBody: {
    alignItems: "center",
    paddingVertical: T.sp24,
    gap: T.sp8,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: T.textMuted,
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.border,
  },
  hotelName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: T.text,
    marginBottom: T.sp8,
    letterSpacing: -0.3,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: T.textSec,
    flex: 1,
    lineHeight: 18,
  },
  stayRow: {
    flexDirection: "row",
    backgroundColor: "rgba(3,105,161,0.06)",
    borderRadius: T.r12,
    padding: T.sp12,
    marginTop: T.sp8,
    marginBottom: T.sp12,
    alignItems: "center",
  },
  stayItem: {
    flex: 1,
    alignItems: "center",
  },
  stayLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: T.textMuted,
    marginBottom: 3,
  },
  stayDate: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: T.text,
  },
  stayDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(3,105,161,0.15)",
    marginHorizontal: 4,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: T.accent,
    borderRadius: T.r10,
    paddingVertical: 12,
    marginTop: T.sp8,
    backgroundColor: "rgba(3,105,161,0.05)",
  },
  callBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: T.accent,
  },
});
